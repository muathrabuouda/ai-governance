# Governance Verification Report

> **Verdict:** **[VERDICT: REQUIRES REVIEW]**  
> **Summary:** 2 gate(s) completed with warnings or require review: Code Formatting, Static Analysis & Linting  
> **Timestamp:** 2026-11-27T17:48:02.229Z (48282ms)  
> **Content Digest (SHA-256):** `419f8e44417c20a48bc0292f40c2df172a6181839a8eacb51ff7758fa46387eb`  
> **Evidence Digital Attestation:** Unsigned (Unsigned (Integrity guaranteed via SHA-256 Content Digest; run 'governance evidence:sign' to attest))  
> **Git Commit Attestation:** Valid (Signed by Muath R Abu Ouda <muathrabuouda@hotmail.com> [173E65E275BE3CD344241ECC0F2E74E6E851065E])

---

## Evidence Integrity & Attestation

- **Content Digest Algorithm:** `sha256`
- **Digest Value:** `419f8e44417c20a48bc0292f40c2df172a6181839a8eacb51ff7758fa46387eb`
- **Detached GPG Attestation:** Unsigned (Unsigned (Integrity guaranteed via SHA-256 Content Digest; run 'governance evidence:sign' to attest))
- **Signature File:** `none (run 'governance evidence:sign')`

## Git Provenance & Commit Attestation

- **Committer:** Muath R Abu Ouda <muathrabuouda@hotmail.com>
- **Git Commit:** `4034c7db12` (Tree: `d27c0d57cb`)
- **Git Commit Signature:** Valid (Signed by Muath R Abu Ouda <muathrabuouda@hotmail.com> [173E65E275BE3CD344241ECC0F2E74E6E851065E])
- **State Head Anchor:** `7953e4f8d5c3c72a...`
- **Policy Profile:** `standard` (Fail on warning: false)

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
| [WARN] Code Formatting | Optional | REQUIRES_REVIEW | [WARN] Code Formatting check failed (optional gate, non-blocking): Code Formatting (Node.js / TypeScript) failed (exit code: 1) |
| [WARN] Static Analysis & Linting | Optional | REQUIRES_REVIEW | [WARN] Static Analysis & Linting check failed (optional gate, non-blocking): Static Analysis (Node.js / TypeScript) failed (exit code: 1) |
| [PASS] Automated Test Suite | Required | PASSED | Test Suite (Node.js / TypeScript) passed |
| [SKIP] UI Design Tokens & System Compliance | Optional | SKIPPED | [INFO] UI Design Tokens & System Compliance skipped: No frontend templates or UI stylesheets found (Not Applicable) |

---

_Generated automatically by AI Governance Platform — "No code without proof"_
