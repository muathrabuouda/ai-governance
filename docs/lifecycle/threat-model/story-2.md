# Threat Model: Story 2 (Specification Locking & State Guardian)

> **Threat Model Standard:** STRIDE Analysis for Specification Integrity & Audit Ledger.

---

## 1. Scope & Assets

- **Asset 1:** Acceptance criteria definitions in `docs/foundation/02-spec.md`.
- **Asset 2:** Cryptographic audit log and locked hashes in `.governance/state.json`.
- **Asset 3:** Git tree hash and Git Notes anchor (`refs/notes/governance`).

---

## 2. STRIDE Analysis & Mitigations

| Threat Category | Potential Attack Vector | Platform Mitigation |
| :--- | :--- | :--- |
| **Spoofing** | Attacker sets fake `git config user.name` to impersonate an authorized approver. | `authorized-approvers.json` supports email and GPG/SSH key fingerprint validation. |
| **Tampering** | AI agent alters criteria table row or modifies `.governance/state.json`. | Full markdown table hashing detects any cell change; backward SHA-256 chain detects state edits; agent contract blocks write access to `.governance/state.json`. |
| **Repudiation** | Engineer denies approving a specification. | Audit log records timestamp, committer SHA, tree hash, and optional commit signature attestation. |
| **Information Disclosure** | Hardcoded secrets or tokens leaked in governance state. | Stage 3 secrets scan scans all committed files and state files before allowing approval. |
| **Denial of Service** | Corrupted state file causing pipeline crashes. | Schema validation and graceful degradation with informative diagnostic error messages. |
| **Elevation of Privilege** | Agent grants itself approver permissions. | Agent contract forbids modifications to `.governance/` and `authorized-approvers.json`. |
