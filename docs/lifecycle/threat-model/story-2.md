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
  ├── Cannot strip headAnchor or bypass Git checks (headAnchor mandatory in strict mode; Git checks unconditional)
  ├── Cannot borrow previous commit signature (diff check against HEAD required)
  ├── Cannot spoof key IDs via Evil32 (short key IDs < 16 hex chars rejected; 16+ or full fingerprints required)
  └── Cannot approve in strict mode without verified GPG/SSH key fingerprint (%G? = G, %GF in allowed list)

                     ↓↓↓ (Push to Remote)

[ TRUSTED: Remote CI & GitHub Protected Environment ]
  GitHub Actions Workflows
  ├── approve-spec.yml:
  │   ├── Actor Authentication: github.actor verified against allowedGitHubActors in authorized-approvers.json
  │   ├── Protected Environment: "governance-approval" (Human Reviewer Required)
  │   └── Traceable Commit: pushes state updates without [skip ci] to trigger CI verification
  └── check.yml:
      └── Standard Governance Gate: runs test suite, formatting, lint, typecheck, audit, and criteria integrity
```

---

## 3. STRIDE Analysis & Enforced Mitigations

| Threat Category | Potential Attack Vector | Platform Enforcement Mechanism | Verification Gate |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Attacker sets forged `git config user.name` or `user.email` to impersonate an authorized approver. | In strict mode (`strictKeyEnforcement`), approval requires `%G? === "G"` and compares full 40-char fingerprint (`%GF`), primary fingerprint (`%GP`), and long key ID (`%GK` >= 16 hex) against `allowedKeyFingerprints`. Forged text configs are rejected. | `approveSpec` Key Fingerprint Guard |
| **Spoofing (Evil32 Collision)** | Attacker generates colliding 32-bit (8 hex char) key ID to match an approver's short ID. | `isKeyFingerprintAuthorized` enforces a minimum length of 16 hex characters, rejecting 32-bit short key IDs in both candidate and allowed lists. Full 40/64-char fingerprints are preferred. | `isKeyFingerprintAuthorized` |
| **Tampering (Anchor Stripping)** | Agent deletes `headAnchor` from `state.json` to bypass external Git and tag checks. | In strict mode, `verifyAuditChain` fails immediately if `headAnchor` is missing. Git tag anchor and state commit signature checks execute unconditionally regardless of JSON properties. | `verifyAuditChain` Unconditional Check |
| **Tampering (Signature Borrowing)** | Agent alters criteria uncommitted and invokes `approve:spec` to borrow the previous commit's signature. | `approveSpec` checks `git diff HEAD -- docs/foundation/02-spec.md` in strict mode; any uncommitted criteria change immediately aborts approval. Furthermore, `verifyAuditChain` verifies that the commit modifying `.governance/state.json` is signed with an authorized key. | Anti-Borrowing Diff Guard & State Commit Verification |
| **Tampering (Direct Edit)** | Agent modifies a single cell in criteria table or deletes an acceptance scenario. | Complete Markdown table parsing captures every cell and separator. Any character modification alters `hashText(block)`, causing an immediate blocking failure. | `spec_integrity` Gate |
| **Tampering (CI Remote Approval Abuse)** | Unauthorized user triggers `workflow_dispatch` with arbitrary approver name. | `approve-spec.yml` authenticates `github.actor` directly against `allowedGitHubActors` in `authorized-approvers.json` and rejects unapproved actors before execution. | GitHub Actor Authentication Step |
| **Repudiation** | Approver denies locking or approving a specification. | Audit ledger captures committer SHA, tree hash, timestamp, signature status, and anchors an immutable annotated Git tag (`governance/spec-v{index}`). | `verifyAuditChain` |
| **Information Disclosure** | Hardcoded secrets or tokens stored inside state or spec files. | Secrets scan runs prior to gate completion and scans all tracked files for high-entropy tokens and API keys. | `secrets` Gate |
| **Denial of Service** | Malformed state JSON crashing the pipeline. | Schema validation and graceful degradation with informative diagnostic error messages. | Policy Engine Loader |
| **Elevation of Privilege** | Local agent attempts to grant itself approver permissions. | Local agent cannot forge cryptographic GPG/SSH signatures. Remote spec approval is gated behind GitHub Actions Protected Environment requiring human sign-off. | GitHub Protected Environment |

---

## 4. Policy Profile Separation & Operational Reality

- **CI Pipeline (`check.yml`):** Runs under `--profile=standard`. It verifies criteria integrity against the cryptographic hash chain, scans for secrets, verifies pinned dependencies, audits conventional commits, and executes the complete automated test suite (22 tests), lint, format, and typecheck. It does not enforce local GPG key signatures on GitHub runners since private signing keys reside exclusively with human developers.
- **Strict Release Gate (`--profile=strict`):** Enforces mandatory GPG/SSH cryptographic commit signatures (`%G? === "G"`) by authorized key fingerprints on every spec approval block, tag anchor, and state commit. Designed for high-assurance release verification on developer workstations or CI environments provisioned with dedicated bot signing keys (`GPG_PRIVATE_KEY`).

---

## 5. Residual Risks (Transparent Disclosure)

1. **Unlocked Local Key Agent Socket:** If an autonomous agent runs with shell access on a machine where `gpg-agent` or `ssh-agent` has an unlocked key in memory without passphrase prompt per operation, the agent could invoke `git commit -S`.  
   *Countermeasure:* Use isolated CI environment approval (`approve-spec.yml`) or configure GPG/SSH agent to require confirmation per signature on development workstations.
2. **Local Git Ref Deletion:** An agent with full local terminal access could delete local git tags.  
   *Countermeasure:* Protected remote branches and tags on GitHub (`governance/*` tag protection) prevent unauthorized tag deletion or force-pushing to the remote origin.
3. **Runner Key Provisioning in CI:** Automated commit signing in CI requires injecting private keys into runner memory, creating secret exfiltration attack surfaces. Therefore, the recommended production pattern is human-initiated local approvals using hardware security keys (e.g., YubiKey) before pushing.
