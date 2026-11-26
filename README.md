# AI Governance

> **"No code without proof"**  
> **The AI-Native Software Engineering & Verification Platform**  
> _Authored by Muath R Abu Ouda <muathrabuouda@hotmail.com>_

---

## Overview

**AI Governance** (codenamed **Governance** / `ai-governance-engine`) is an enterprise-grade architectural verification engine and command-line harness designed to govern the end-to-end software engineering lifecycle when collaborating with autonomous AI agents.

In modern AI-assisted engineering, code generation is rapid, but verification and architectural trust are paramount. AI Governance ensures that every feature, boundary, contract, and decision is backed by verifiable cryptographic and static proof:

- **Policy-Driven Gate Engine:** 9 configurable gates (`.governance/policy.json`) governing acceptance criteria, secrets, dependencies, formatting, static analysis, testing, threat models, design tokens, and git hygiene.
- **Cryptographic Trust Model:** Tamper-evident SHA-256 hash-chained audit ledger (`state.json`) preventing autonomous agents from altering approved specifications or test criteria.
- **Hybrid Multi-Stack Detection:** Automatic parallel detection and runner orchestration for hybrid codebases (e.g., Laravel backend + Vue/TypeScript frontend, Python microservices, Android/Gradle).
- **Specification-First Governance:** Domain models, ADRs, and acceptance criteria formally locked before code generation.
- **Agent Guardrails:** Pre-commit hooks, Gitleaks CI actions, and scoped rulebooks (`AGENTS.md`, `.cursorrules`, `CLAUDE.md`).

---

## Installation & Quick Start

Run instantly anywhere via `npx` directly from GitHub without cloning or manual setup:

```bash
# Initialize Governance 3-pillar methodology in any project
npx github:muathrabuouda/ai-governance init "My Project"

# Check project governance status & policy gates
npx github:muathrabuouda/ai-governance check

# View governance status summary & ADRs
npx github:muathrabuouda/ai-governance status

# Formally approve and cryptographically lock acceptance criteria
npx github:muathrabuouda/ai-governance approve:spec "Muath R Abu Ouda"

# Record a new Architecture Decision Record (ADR)
npx github:muathrabuouda/ai-governance new:adr "Adopt Clean Architecture"

# Scaffold a new User Story with Acceptance Criteria
npx github:muathrabuouda/ai-governance new:story 1 "User Authentication"

# Generate agent instruction rules (.cursorrules, CLAUDE.md, Copilot)
npx github:muathrabuouda/ai-governance rules

# Install Git pre-commit enforcement hooks
npx github:muathrabuouda/ai-governance install:hooks

# Install Stack-Aware GitHub Actions CI Workflow
npx github:muathrabuouda/ai-governance install:ci
```

Or install globally on your development machine:

```bash
npm install -g github:muathrabuouda/ai-governance
governance --help
```

---

## Architecture & Trust Model

### 1. State Guardian Cryptographic Hash Chain & Git Attestation

AI agents with workspace write access could theoretically modify acceptance criteria in `docs/foundation/02-spec.md` and simultaneously falsify verification state.

AI Governance solves this via a **tamper-evident cryptographic hash chain with Git tree anchoring** stored in `.governance/state.json`:

1. **Genesis Block:** Block 0 anchors the audit ledger with `previousHash: "0000000000000000000000000000000000000000000000000000000000000000"`.
2. **Linked Chain & Attestation:** Every subsequent approval or story deprecation captures committer identity (`userName`, `userEmail`, `commitSha`, `treeHash`) and links cryptographically to the preceding block hash:
   $$\text{hash}_n = \text{SHA256}(n + \text{hash}_{n-1} + \text{timestamp} + \text{author} + \text{action} + \text{details} + \text{attestation})$$
3. **External Git Tree Anchor:** State Guardian anchors the latest block hash to the external git tree object (`headAnchor`), preventing agents from deleting `.governance/state.json` and rewriting audit logs from scratch.
4. **Authorized Approvers Protection:** Supports `.governance/authorized-approvers.json` to cryptographically whitelist authorized signers and reject unverified agent approvals.
5. **Story Lifecycle & Deprecation:** Obsolete stories can be formally deprecated with audit accountability and synchronized specification headers via:
   ```bash
   governance deprecate:story <id> "Replaced by Story 5 in Sprint 3" [--superseded-by=5]
   ```
6. **Specification Pruning:** When specifications are refactored, pruning removed stories requires explicit human authorization:
   ```bash
   governance approve:spec "Muath R Abu Ouda" --prune
   ```

### 2. Policy-Driven Execution Engine (`policy.json`)

All verification rules are declared in `.governance/policy.json`, allowing teams to customize thresholds per environment (`strict`, `standard`, `lenient`):

```json
{
  "profile": "standard",
  "profiles": {
    "strict": {
      "fail_on_warning": true,
      "require_threat_model": true,
      "require_clean_git": true
    },
    "standard": {
      "fail_on_warning": false,
      "require_threat_model": false,
      "require_clean_git": false
    }
  },
  "gates": {
    "state_guardian": { "required": true, "on_missing": "fail" },
    "secrets": { "required": true, "on_missing": "fail" },
    "git_audit": { "required": true, "on_missing": "skip" },
    "dependencies": { "required": true, "on_missing": "warn" },
    "formatting": { "required": false, "on_missing": "skip" },
    "lint_and_types": { "required": false, "on_missing": "skip" },
    "test_suite": { "required": true, "on_missing": "warn" },
    "threat_model": { "required": false, "on_missing": "skip" },
    "design_audit": { "required": false, "on_missing": "skip" }
  }
}
```

#### Gate Outcome Taxonomy
Instead of conflating skipped steps with passed results, every gate outputs an explicit outcome:
- `PASSED`: Gate executed and satisfied all acceptance criteria.
- `FAILED`: Gate executed and failed checks.
- `SKIPPED`: Gate skipped intentionally (e.g. no git history or not requested).
- `NOT_CONFIGURED`: Tool or runner not found in environment (triggers policy evaluation based on `on_missing`).
- `REQUIRES_REVIEW`: Informational gate requiring human sign-off.

### 3. Verdict & Traceability Engine (`.governance/evidence/`)

Every execution of `governance check` generates cryptographic proof in `.governance/evidence/`:
1. **`verdict.json`:** Machine-readable proof signed with SHA-256 digest, recording committer attestation, state head anchor, timings, and all 9 gate statuses (`APPROVED` | `REJECTED` | `REQUIRES_REVIEW`).
2. **`report.md`:** Executive markdown summary with ASCII compliance checklist for PR comments and compliance audits.
3. **`traceability.json`:** Requirement-to-code mapping linking user stories to implementation files, test suites, and STRIDE threat models.

Inspect the latest verdict or traceability matrix at any time:
```bash
governance verdict
governance trace
```

### 4. Agent Governance & Control Plane (`.governance/agent-contract.json`)

To transition from passive testing to active control of autonomous AI agents, AI Governance establishes an immutable **Agent Governance Contract**:
- **Protected Paths:** Unauthorized modifications to `.governance/state.json`, `.governance/policy.json`, `.governance/agent-contract.json`, `docs/foundation/adr/**`, and `LICENSE` are strictly blocked.
- **Forbidden Actions:** Agents are prohibited from deleting test files, commenting out assertions, or mutating existing ADRs.
- **Workspace Guardrails:** Run `governance agent:audit` to audit uncommitted or branch changes against permission boundaries.

```bash
# Audit workspace changes against agent contract
governance agent:audit

# Initialize custom agent contract
governance init:contract
```

---

## Governance CLI (`governance`)

```bash
governance <command> [options]
```

### Available Commands

| Command | Description |
| :--- | :--- |
| `check [--profile=...]` | Multi-stack verification pipeline enforcing all 9 policy gates (strict, standard, lenient). |
| `verdict` | Displays the latest cryptographic governance verdict and audit proof summary. |
| `trace [story]` | Displays the requirement-to-code and test traceability matrix. |
| `agent:audit` | Audits working tree changes against Agent Governance Contract rules and protected paths. |
| `init:contract [--force]` | Initializes or resets the Agent Governance Contract (`.governance/agent-contract.json`). |
| `status` | Summarizes project governance status, registered ADRs, and active story progression. |
| `init [title] [--force]` | Initializes the full 3-pillar methodology documentation suite (safe by default). |
| `approve:spec [name] [--prune]` | Formally approves and cryptographically locks Acceptance Criteria into `.governance/state.json`. |
| `deprecate:story <id> [reason] [--superseded-by=<new_id>]` | Deprecates an approved story in the audit ledger and spec with reason tracking. |
| `new:adr <title>` | Records a new Architecture Decision Record in `docs/foundation/adr/`. |
| `list:adr` | Lists all Architecture Decision Records and their statuses. |
| `new:story <id> <title>` | Scaffolds a new user story with acceptance criteria (prevents duplicates). |
| `new:threat <id> [title]` | Creates a story-level STRIDE threat model in `docs/lifecycle/threat-model/`. |
| `rules` | Generates managed AI agent instructions (`.cursorrules`, `CLAUDE.md`, Copilot). |
| `install:hooks` | Installs Git pre-commit verification hook (preserves existing hooks with real exit codes). |
| `install:ci` | Generates stack-aware GitHub Actions workflow (`.github/workflows/governance-gate.yml`) with Gitleaks. |
| `audit:git` | Audits git commits against Conventional Commits standards. |
| `audit:design` | Audits UI templates for Design System rules (70-20-10 distribution, accent-only green). |
| `secrets` | Scans repository for exposed API keys, private tokens, and credentials (with allowlist support). |
| `deps` | Verifies that all dependencies are strictly pinned and security-approved. |
| `map` | Generates a structured repository architectural map (`docs/repo-map.md`). |
| `prompt [phase]` | Displays engineering prompts across the 13 methodology phases (00 to 12). |

---

## The 13-Stage AI Engineering Methodology

AI Governance provides a complete prompt library guiding autonomous agents through structured engineering stages:

```text
prompts/
├── 00-setup/                  # Baseline project environment
├── 01-requirements/           # Ambiguity reduction & acceptance criteria
├── 02-threat-modeling/        # One-page STRIDE threat assessment
├── 03-adr/                    # Architecture Decision Records
├── 04-design-system/          # 70-20-10 token architecture & UI rules
├── 05-domain-modeling/        # Hexagonal architecture & Result types
├── 06-agents/                 # Tools, MCP servers, subagents, and hooks
├── 07-dependencies/           # Zero/pinned dependency gates & wrappers
├── 08-quality/                # CI/CD multi-job verification matrix
├── 09-testing/                # Mutation, property-based, and regression tests
├── 10-refactoring/            # Characterization tests & atomic refactoring
├── 11-performance-security/   # Benchmarks & vulnerability scanning
└── 12-lifecycle/              # Phased rollout, canary deployments & runbooks
```

---

## Author & Vision

* **Muath R Abu Ouda** — Lead Architect & Creator ([GitHub](https://github.com/muathrabuouda))
* Built for developers and autonomous agents committed to rigorous software verification.

## License

AI Governance is open-sourced software licensed under the [MIT license](LICENSE.md).
