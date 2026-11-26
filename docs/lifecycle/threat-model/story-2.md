# Threat Model: Story 2 (Specification Locking & State Guardian)

> **Threat Model Standard:** STRIDE Analysis for Specification Integrity, Signature Enforcement & Audit Ledger.

---

## 1. Scope & Protected Assets

- **Asset 1:** Acceptance criteria tables in `docs/foundation/02-spec.md`.
- **Asset 2:** Cryptographic audit log and locked hashes in `.governance/state.json`.
- **Asset 3:** External head anchor (`state.headAnchor`) cryptographically linking state to git commit and tree hashes.
- **Asset 4:** Immutable Git Tag Anchors (`refs/tags/governance/spec-v*`) in Git object database.
- **Asset 5:** Authorized approver key fingerprints (`allowedKeyFingerprints`) and actors (`allowedGitHubActors`) in `.governance/authorized-approvers.json`.

---

## 2. Security Boundaries & Trust Architecture

The platform separates verification into two distinct trust boundaries:

```text
[ UNTRUSTED: Local Workstation ]
  AI Agent / Workspace Filesystem
  ├── Can modify: source code, docs/foundation/02-spec.md
  ├── Cannot tamper working tree without commit (dirty diff on state/spec blocked in strict mode)
  ├── Cannot strip headAnchor or bypass Git checks (headAnchor mandatory in strict mode; Git checks unconditional)
  ├── Cannot borrow previous commit signature (diff check against HEAD required)
  ├── Cannot spoof key IDs via Evil32 (short key IDs < 16 hex chars rejected; 16+ or full fingerprints required)
  └── Cannot approve in strict mode without verified GPG/SSH key fingerprint (%G? = G, %GF in allowed list)

                     ↓↓↓ (Push to Remote)

[ TRUSTED: Remote CI & GitHub Protected Environment ]
  GitHub Actions Workflows
  ├── approve-spec.yml:
  │   ├── Actor Authentication: github.actor verified against allowedGitHubActors in authorized-approvers.json
  │   ├── Protected Environment: "governance-approval" (Required Human Reviewers)
  │   ├── Isolated Secrets: GPG_PRIVATE_KEY stored exclusively as Environment Secret, unreachable by PR agents
  │   ├── GPG Ownertrust: runner sets ultimate ownertrust (level 6) ensuring %G? evaluates to G
  │   └── Traceable Commit: pushes state updates without [skip ci] to trigger CI verification
  └── check.yml:
      ├── Standard Governance Gate: runs test suite, formatting, lint, typecheck, audit, and criteria integrity
      └── Strict Governance Audit Job: automatically detects changes to .governance/state.json or 02-spec.md
          and enforces --profile=strict commit signature verification on sensitive modifications
```

---

## 3. STRIDE Analysis & Enforced Mitigations

| Threat Category | Potential Attack Vector | Platform Enforcement Mechanism | Verification Gate |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Attacker sets forged `git config user.name` or `user.email` to impersonate an authorized approver. | In strict mode (`strictKeyEnforcement`), approval requires `%G? === "G"` and compares full 40-char fingerprint (`%GF`), primary fingerprint (`%GP`), and long key ID (`%GK` >= 16 hex) against `allowedKeyFingerprints`. Forged text configs are rejected. | `approveSpec` Key Fingerprint Guard |
| **Spoofing (Evil32 Collision)** | Attacker generates colliding 32-bit (8 hex char) key ID to match an approver's short ID. | `isKeyFingerprintAuthorized` enforces a minimum length of 16 hex characters, rejecting 32-bit short key IDs in both candidate and allowed lists. Full 40/64-char fingerprints are preferred. | `isKeyFingerprintAuthorized` |
| **Tampering (Dirty Working Tree)** | Agent alters `state.json` or criteria in local working directory without committing, borrowing previous signed HEAD. | In strict mode, `verifyAuditChain` runs `git diff HEAD -- .governance/state.json docs/foundation/02-spec.md`. Any uncommitted modifications trigger an immediate blocking security failure. | `verifyAuditChain` Dirty Diff Guard |
| **Tampering (Anchor Stripping)** | Agent deletes `headAnchor` from `state.json` to bypass external Git and tag checks. | In strict mode, `verifyAuditChain` fails immediately if `headAnchor` is missing. Git tag anchor and state commit signature checks execute unconditionally regardless of JSON properties. | `verifyAuditChain` Unconditional Check |
| **Tampering (Signature Borrowing)** | Agent alters criteria uncommitted and invokes `approve:spec` to borrow the previous commit's signature. | `approveSpec` checks `git diff HEAD -- docs/foundation/02-spec.md` in strict mode; any uncommitted criteria change immediately aborts approval. Furthermore, `verifyAuditChain` verifies that the commit modifying `.governance/state.json` is signed with an authorized key. | Anti-Borrowing Diff Guard & State Commit Verification |
| **Tampering (Unsigned Governance Changes in CI)** | Attacker pushes unsigned commit modifying `.governance/state.json` or `02-spec.md` under standard profile. | `check.yml` includes a dedicated `strict-governance-audit` job that detects modifications to governance files and runs `check --profile=strict`, blocking any unverified governance alteration. | CI Strict Governance Audit Job |
| **Tampering (CI Remote Approval Abuse)** | Unauthorized user triggers `workflow_dispatch` with arbitrary approver name. | `approve-spec.yml` authenticates `github.actor` directly against `allowedGitHubActors` in `authorized-approvers.json` and rejects unapproved actors before execution. | GitHub Actor Authentication Step |
| **Repudiation** | Approver denies locking or approving a specification. | Audit ledger captures committer SHA, tree hash, timestamp, signature status, and anchors an immutable annotated Git tag (`governance/spec-v{index}`). | `verifyAuditChain` |
| **Information Disclosure** | Hardcoded secrets or tokens stored inside state or spec files. | Secrets scan runs prior to gate completion and scans all tracked files for high-entropy tokens and API keys. | `secrets` Gate |
| **Denial of Service** | Malformed state JSON crashing the pipeline. | Schema validation and graceful degradation with informative diagnostic error messages. | Policy Engine Loader |
| **Elevation of Privilege** | Agent pushes branch attempting to extract repository GPG signing secrets. | GPG signing credentials must be configured strictly as **Environment Secrets** under `governance-approval` requiring human reviewer sign-off. Workflows on unauthorized branches or PRs cannot access environment secrets. | GitHub Protected Environment Isolation |

---

## 4. Policy Profile Separation & Operational Reality

- **CI Standard Pipeline:** Commits modifying regular application code run under `--profile=standard`, verifying criteria integrity, secrets, dependencies, conventional commits, automated tests (25 tests), lint, and format.
- **CI Strict Governance Audit:** When any commit touches `.governance/state.json` or `docs/foundation/02-spec.md`, CI triggers `--profile=strict` verification, requiring cryptographically verified commit signatures (`%G? === "G"`) matching `allowedKeyFingerprints`.
- **Strict Release Gate:** Enforces mandatory GPG/SSH cryptographic commit signatures on all spec approvals, tag anchors, and state commits.

---

## 5. Residual Risks (Transparent Disclosure)

1. **Unlocked Local Key Agent Socket:** If an autonomous agent runs with shell access on a machine where `gpg-agent` or `ssh-agent` has an unlocked key in memory without passphrase prompt per operation, the agent could invoke `git commit -S`.  
   *Countermeasure:* Use isolated CI environment approval (`approve-spec.yml`) or configure GPG/SSH agent to require confirmation per signature on development workstations.
2. **Local Git Ref Deletion:** An agent with full local terminal access could delete local git tags.  
   *Countermeasure:* Protected remote branches and tags on GitHub (`governance/*` tag protection) prevent unauthorized tag deletion or force-pushing to the remote origin.
3. **Token Ownership Boundary:** `github.actor` authenticates the token owner initiating the workflow dispatch. A rogue agent possessing developer CLI tokens (`gh`) would execute as that user. The definitive defense is configuring GitHub Environment `governance-approval` with **Required Reviewers**, requiring manual human approval in the GitHub UI before runner execution and environment secret revelation.
