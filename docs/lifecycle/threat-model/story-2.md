# Threat Model: Story 2 (Specification Locking & State Guardian)

> **Threat Model Standard:** STRIDE Analysis for Specification Integrity, Signature Enforcement & Audit Ledger.

---

## 1. Scope & Protected Assets

- **Asset 1:** Acceptance criteria tables in `docs/foundation/02-spec.md`.
- **Asset 2:** Cryptographic audit log and locked hashes in `.governance/state.json`.
- **Asset 3:** Immutable Git Tag Anchors (`refs/tags/governance/spec-v*`) in Git object database.
- **Asset 4:** Authorized approver key fingerprints in `.governance/authorized-approvers.json`.

---

## 2. Security Boundaries & Trust Architecture

The platform separates verification into two distinct trust boundaries:

```text
[ UNTRUSTED: Local Workstation ]
  AI Agent / Workspace Filesystem
  ├── Can modify: source code, docs/foundation/02-spec.md
  └── Cannot approve in strict mode without verified GPG/SSH key fingerprint (%G? = G)

                     ↓↓↓ (Push to Remote)

[ TRUSTED: Remote CI & GitHub Protected Environment ]
  GitHub Actions Workflow (.github/workflows/approve-spec.yml)
  ├── Protected Environment: "governance-approval" (Human Reviewer Required)
  ├── Out-of-band human approval outside agent reach
  └── CI Gate (.github/workflows/check.yml) enforces strict signature & tag presence
```

---

## 3. STRIDE Analysis & Enforced Mitigations

| Threat Category | Potential Attack Vector | Platform Enforcement Mechanism | Verification Gate |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Attacker sets forged `git config user.name` or `user.email` to impersonate an authorized approver. | In strict mode (`strictKeyEnforcement`), approval requires `%G? === "G"` and compares `signerKey` against `allowedKeyFingerprints`. Forged text configurations are rejected. | `approveSpec` Key Fingerprint Guard |
| **Tampering** | Agent modifies a single cell in criteria table or deletes an acceptance scenario. | Complete Markdown table parsing captures every cell and separator. Any character modification alters `hashText(block)`, causing an immediate blocking failure. | `spec_integrity` Gate |
| **Repudiation** | Approver denies locking or approving a specification. | Audit ledger captures committer SHA, tree hash, timestamp, signature status, and anchors an immutable annotated Git tag (`governance/spec-v{index}`). | `verifyAuditChain` |
| **Information Disclosure** | Hardcoded secrets or tokens stored inside state or spec files. | Secrets scan runs prior to gate completion and scans all tracked files for high-entropy tokens and API keys. | `secrets` Gate |
| **Denial of Service** | Malformed state JSON crashing the pipeline. | Schema validation and graceful degradation with informative diagnostic error messages. | Policy Engine Loader |
| **Elevation of Privilege** | Local agent attempts to grant itself approver permissions. | Local agent cannot forge cryptographic GPG/SSH signatures. Remote spec approval is gated behind GitHub Actions Protected Environment requiring human sign-off. | GitHub Protected Environment |

---

## 4. Residual Risks (Transparent Disclosure)

1. **Unlocked Local Key Agent Socket:** If an autonomous agent runs with shell access on a machine where `gpg-agent` or `ssh-agent` has an unlocked key in memory without passphrase prompt per operation, the agent could invoke `git commit -S`.  
   *Countermeasure:* Use isolated CI environment approval (`approve-spec.yml`) or require passphrase confirmation per signature on development workstations.
2. **Local Git Ref Deletion:** An agent with full local terminal access could delete local git tags.  
   *Countermeasure:* Protected remote branches and tags on GitHub (`governance/*` tag protection) prevent unauthorized tag deletion or force-pushing to the remote origin.
