# Specification: AI Software Engineering Governance Platform · Version 1.0

> **Governance Foundation Document 02:** Formal User Stories & Acceptance Criteria.

---

## 1. Goal

Provide an autonomous, deterministic, and tamper-evident governance platform (`@muathrabuouda/ai-governance`) that verifies multi-stack software projects, locks acceptance criteria, enforces agent operating boundaries, and produces verifiable cryptographic verdict evidence ("No code without proof").

---

## 2. Roles & Permissions

| Role | Permissions & Operational Scope |
| :--- | :--- |
| **Engineering Lead / Signer** | Approves specifications, manages policy profiles, configures authorized approvers, and deprecates stories. |
| **CI / CD Pipeline** | Executes the automated verification gate pipeline, validates tamper-evidence, and publishes signed verdict ledgers. |
| **AI Coding Agent** | Plans, generates code, and adds tests within strict path boundaries defined by the agent governance contract. |
| **Auditor / Compliance** | Inspects signed verdict proofs (`verdict.json`), traceability matrices, and cryptographic audit hash chains. |

---

## 3. Scope (MoSCoW)

- **Must Have:**
  - Multi-stack automated gate execution (Node.js, PHP, Python, Java).
  - Acceptance criteria cryptographic locking and tampering detection.
  - Append-only backward-linked SHA-256 audit log hash chain with Git tree anchoring.
  - Cryptographic verdict evidence generation (`verdict.json` and truthful `report.md`).
  - Agent boundary enforcement and protected path locking (`agent-contract.json`).
- **Should Have:**
  - Cross-platform Git commit signature attestation (GPG / SSH detection).
  - External Git Notes object anchoring (`refs/notes/governance`).
  - Automated requirements-to-tests traceability matrix generation.
- **Could Have:**
  - Dynamic linting and formatting auto-remediation.
  - Multi-tenant compliance dashboard webhooks.
- **Won't Have (v1):**
  - Blockchain or distributed consensus network dependencies.
  - Cloud-hosted proprietary telemetry or mandatory SaaS connections.

---

## 4. User Stories & Acceptance Criteria

### Story 1: Multi-Stack Policy Gate Pipeline

**As an** engineering lead or CI workflow,  
**I want to** execute a deterministic sequence of policy verification gates across all detected project stacks,  
**So that** no unverified, insecure, or non-compliant code can merge into production.

| ID | Given | When | Then |
| :-- | :--- | :--- | :--- |
| 1.1 | Project contains valid package.json with test script | Maintainer runs `governance check` | Node.js test runner executes and its exit outcome is evaluated against policy |
| 1.2 | Project contains both PHP (composer.json) and Node.js (package.json) | Maintainer runs `governance check` | Multi-stack runner detects both stacks and executes verification independently for each |
| 1.3 | Stack has missing test runner or dependencies | Maintainer runs `governance check` | Stage is marked `NOT_CONFIGURED` with actionable diagnostics and evaluated per `on_missing` policy |

---

### Story 2: Specification Locking & Tamper-Evident State

**As a** system guardian or reviewer,  
**I want to** cryptographically lock approved acceptance criteria and verify state continuity via a backward-linked SHA-256 hash chain,  
**So that** unauthorized agents or prompt injections cannot weaken or delete acceptance criteria silently.

| ID | Given | When | Then |
| :-- | :--- | :--- | :--- |
| 2.1 | Human approver approves specification | Maintainer runs `governance approve:spec "<name>"` | Acceptance criteria tables are parsed, hashed, appended to audit chain, and anchored to Git tree |
| 2.2 | Acceptance criteria table cell is modified in 02-spec.md | Verification pipeline executes | System detects criteria hash mismatch and halts with blocking integrity violation |
| 2.3 | Active story criteria row is deleted from 02-spec.md | Verification pipeline executes | System detects criteria deletion and halts with blocking violation unless formally deprecated |

---

### Story 3: Cryptographic Verdict & Provenance Ledger

**As an** auditor or compliance system,  
**I want** the platform to issue a signed `verdict.json` and human-readable `report.md` with complete committer attestation and gate matrix,  
**So that** every software release has verifiable, reproducible proof of compliance.

| ID | Given | When | Then |
| :-- | :--- | :--- | :--- |
| 3.1 | All required policy gates pass | Pipeline completes execution | Generates signed `verdict.json` with status `APPROVED` and truthful `[PASS]` badges in `report.md` |
| 3.2 | Any required policy gate fails | Pipeline completes execution | Generates signed `verdict.json` with status `REJECTED` and halts with non-zero exit code |
| 3.3 | Optional gate is skipped or not configured | Pipeline completes execution | `report.md` displays truthful `[SKIP]` or `[NOT CONFIGURED]`, never a false `[PASS]` |

---

### Story 4: Agent Boundary & Protected Path Enforcement

**As a** repository maintainer collaborating with autonomous AI agents,  
**I want to** enforce strict file-path write boundaries and capability contracts,  
**So that** AI coding agents cannot rewrite governance state, alter policies, or delete test suites.

| ID | Given | When | Then |
| :-- | :-- | :--- | :--- |
| 4.1 | Agent attempts to edit `.governance/state.json` or `.governance/policy.json` | Boundary enforcement check runs | Operation is rejected with a protected path security violation |
| 4.2 | Agent attempts to delete files under `tests/` or modify `LICENSE.md` | Pre-execution hook evaluates command | Action is blocked under forbidden actions defined in `agent-contract.json` |
| 4.3 | New agent workspace is initialized | Maintainer runs `governance agent:init` | Creates default `.governance/agent-contract.json` with strict mode enabled |
