# Governance Verification Report

> **Verdict:** **[VERDICT: APPROVED]**  
> **Summary:** All active verification gates passed  
> **Timestamp:** 2026-11-28T09:08:32.059Z (69523ms)  
> **Content Digest (SHA-256):** `c503804dea42fb8cc3b6a7a116f873f398d73d305bbc2a75aaf1f3f4f937a7db`  
> **Evidence Digital Attestation:** Unsigned (Stale detached GPG signature does not match regenerated verdict: gpg_verification_failed: Command failed: "C:/Program Files/Git/usr/bin/gpg.exe" --batch --status-fd 1 --verify "J:\ugarit\ugarit-ai\ai-governance\.governance\evidence\verdict.json.asc" "J:\ugarit\ugarit-ai\ai-governance\.governance\evidence\verdict.json"
gpg: Signature made Sat Nov 28 11:06:48 2026 JST
gpg:                using EDDSA key 173E65E275BE3CD344241ECC0F2E74E6E851065E
gpg: BAD signature from "Muath R Abu Ouda <muathrabuouda@hotmail.com>" [ultimate]
. Run 'governance evidence:sign' to re-sign current verdict.)  
> **Git Commit Attestation:** Valid (Signed by Muath R Abu Ouda <muathrabuouda@hotmail.com> [173E65E275BE3CD344241ECC0F2E74E6E851065E])

---

## Evidence Integrity & Attestation

- **Content Digest Algorithm:** `sha256`
- **Digest Value:** `c503804dea42fb8cc3b6a7a116f873f398d73d305bbc2a75aaf1f3f4f937a7db`
- **Detached GPG Attestation:** Unsigned (Stale detached GPG signature does not match regenerated verdict: gpg_verification_failed: Command failed: "C:/Program Files/Git/usr/bin/gpg.exe" --batch --status-fd 1 --verify "J:\ugarit\ugarit-ai\ai-governance\.governance\evidence\verdict.json.asc" "J:\ugarit\ugarit-ai\ai-governance\.governance\evidence\verdict.json"
gpg: Signature made Sat Nov 28 11:06:48 2026 JST
gpg:                using EDDSA key 173E65E275BE3CD344241ECC0F2E74E6E851065E
gpg: BAD signature from "Muath R Abu Ouda <muathrabuouda@hotmail.com>" [ultimate]
. Run 'governance evidence:sign' to re-sign current verdict.)
- **Signature File:** `verdict.json.asc`

## Git Provenance & Commit Attestation

- **Committer:** Muath R Abu Ouda <muathrabuouda@hotmail.com>
- **Git Commit:** `2ee5e52c28` (Tree: `881495ffe1`)
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
