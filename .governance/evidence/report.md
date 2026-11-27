# Governance Verification Report

> **Verdict:** **[VERDICT: REQUIRES REVIEW]**  
> **Summary:** 2 gate(s) completed with warnings or require review: Code Formatting, Static Analysis & Linting  
> **Timestamp:** 2026-11-27T13:00:48.198Z (41136ms)  
> **Content Digest (SHA-256):** `c398ffa718e4ea5c23e69db52fa2e3d4f8330bae1c1950b8513a3cec67e10a3d`  
> **Evidence Digital Attestation:** Unsigned (Unsigned (Integrity guaranteed via SHA-256 Content Digest; run 'governance evidence:sign' to attest))  
> **Git Commit Attestation:** Unsigned

---

## Evidence Integrity & Attestation

- **Content Digest Algorithm:** `sha256`
- **Digest Value:** `c398ffa718e4ea5c23e69db52fa2e3d4f8330bae1c1950b8513a3cec67e10a3d`
- **Detached GPG Attestation:** Unsigned (Unsigned (Integrity guaranteed via SHA-256 Content Digest; run 'governance evidence:sign' to attest))
- **Signature File:** `none (run 'governance evidence:sign')`

## Git Provenance & Commit Attestation

- **Committer:** Muath R Abu Ouda <muathrabuouda@hotmail.com>
- **Git Commit:** `724bbe837b` (Tree: `cc216bfb99`)
- **Git Commit Signature:** Unsigned
- **State Head Anchor:** `b82e8d3fcf434e1d...`
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
