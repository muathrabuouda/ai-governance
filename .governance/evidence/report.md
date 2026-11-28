# Governance Verification Report

> **Verdict:** **[VERDICT: APPROVED]**  
> **Summary:** All active verification gates passed  
> **Timestamp:** 2026-11-28T10:18:18.431Z (69462ms)  
> **Content Digest (SHA-256):** `a5a68c8e87e8b55596486de064413577184ec39fca256dec6d9b795878464cbc`  
> **Evidence Digital Attestation:** Unsigned (Stale detached GPG signature does not match regenerated verdict: gpg_verification_failed: Command failed: "C:/Program Files/Git/usr/bin/gpg.exe" --batch --status-fd 1 --verify "J:\ugarit\ugarit-ai\ai-governance\.governance\evidence\verdict.json.asc" "J:\ugarit\ugarit-ai\ai-governance\.governance\evidence\verdict.json"
gpg: Signature made Sat Nov 28 11:08:43 2026 JST
gpg:                using EDDSA key 173E65E275BE3CD344241ECC0F2E74E6E851065E
gpg: BAD signature from "Muath R Abu Ouda <muathrabuouda@hotmail.com>" [ultimate]
. Run 'governance evidence:sign' to re-sign current verdict.)  
> **Git Commit Attestation:** Valid (Signed by Muath R Abu Ouda <muathrabuouda@hotmail.com> [173E65E275BE3CD344241ECC0F2E74E6E851065E])

---

## Evidence Integrity & Attestation

- **Content Digest Algorithm:** `sha256`
- **Digest Value:** `a5a68c8e87e8b55596486de064413577184ec39fca256dec6d9b795878464cbc`
- **Detached GPG Attestation:** Unsigned (Stale detached GPG signature does not match regenerated verdict: gpg_verification_failed: Command failed: "C:/Program Files/Git/usr/bin/gpg.exe" --batch --status-fd 1 --verify "J:\ugarit\ugarit-ai\ai-governance\.governance\evidence\verdict.json.asc" "J:\ugarit\ugarit-ai\ai-governance\.governance\evidence\verdict.json"
gpg: Signature made Sat Nov 28 11:08:43 2026 JST
gpg:                using EDDSA key 173E65E275BE3CD344241ECC0F2E74E6E851065E
gpg: BAD signature from "Muath R Abu Ouda <muathrabuouda@hotmail.com>" [ultimate]
. Run 'governance evidence:sign' to re-sign current verdict.)
- **Signature File:** `verdict.json.asc`

## Git Provenance & Commit Attestation

- **Committer:** Muath R Abu Ouda <muathrabuouda@hotmail.com>
- **Git Commit:** `694420fd45` (Tree: `9fe7dded01`)
- **Git Commit Signature:** Valid (Signed by Muath R Abu Ouda <muathrabuouda@hotmail.com> [173E65E275BE3CD344241ECC0F2E74E6E851065E])
- **State Head Anchor:** `7953e4f8d5c3c72a...`
- **Policy Profile:** `strict` (Fail on warning: true)

## Detected Engineering Stacks

- **Node.js / TypeScript** (node)

---

## Gate Verification Matrix

| Gate | Requirement | Status | Diagnostics & Proof |
| :--- | :--- | :--- | :--- |
| [PASS] Specification & Criteria Lock | Required | PASSED | Acceptance Criteria integrity intact (no tampering detected) |
| [PASS] Threat Model Coverage | Required | PASSED | Threat model coverage verified for active stories |
| [PASS] Secret Leaks & Token Scanning | Required | PASSED | No secret leaks detected |
| [PASS] Dependency Version Pinning & Approval | Required | PASSED | All dependencies pinned and verified |
| [PASS] Conventional Commit & Git Hygiene | Required | PASSED | Git commit conventions and history valid |
| [PASS] Code Formatting | Required | PASSED | Code Formatting (Node.js / TypeScript) passed |
| [PASS] Static Analysis & Linting | Required | PASSED | Static Analysis (Node.js / TypeScript) passed |
| [PASS] Automated Test Suite | Required | PASSED | Test Suite (Node.js / TypeScript) passed |
| [SKIP] UI Design Tokens & System Compliance | Required | SKIPPED | [INFO] UI Design Tokens & System Compliance skipped: No frontend templates or UI stylesheets found (Not Applicable) |

---

_Generated automatically by AI Governance Platform — "No code without proof"_
