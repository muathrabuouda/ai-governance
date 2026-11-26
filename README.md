# AI Governance Engine

> **"No code without proof"**  
> **Verification Harness, Policy Engine & Guardrails for AI-Assisted Software Engineering**  
> _Authored by Muath R Abu Ouda <muathrabuouda@hotmail.com>_

---

## Overview

**AI Governance** (`@muathrabuouda/ai-governance` / `ai-governance-engine`) is an architectural verification harness and CLI engine designed to establish deterministic guardrails when developing software alongside autonomous AI coding agents.

In AI-assisted engineering, code generation is rapid, but verification and compliance are critical. AI Governance ensures that every feature, boundary, and specification is backed by verifiable static and runtime evidence:

- **Policy-Driven Gate Pipeline:** 9 configurable gates (`.governance/policy.json`) governing acceptance criteria integrity, threat models, secret leaks, dependencies, formatting, static analysis, automated test suites, UI design tokens, and Git hygiene.
- **Specification Locking & Tamper Detection:** Full acceptance criteria tables are hashed and tracked in an append-only, backward-linked SHA-256 audit ledger (`state.json`), detecting when an agent modifies, weakens, or deletes criteria.
- **External Git & Notes Anchoring:** Cross-platform tree hash extraction (`git log -1 --format="%T"`) and external Git Notes object anchoring (`refs/notes/governance`) prevent silent state rewrites.
- **Multi-Stack Orchestration:** Unified detection and independent execution across Node.js/TypeScript, PHP (Pest/PHPUnit), Python (pytest), and Java (Gradle) stacks.
- **Signed Verdict & Traceability Ledger:** Generates machine-readable `verdict.json` signed with a SHA-256 digest, truthful human-readable `report.md`, and automated requirements-to-tests traceability mapping.
- **Agent Operating Contracts:** Declarative boundaries (`agent-contract.json`) that protect critical configuration, policy files, and test suites from unauthorized agent modification.

---

## Installation & Quick Start

Run instantly anywhere via `npx` directly from GitHub without cloning or manual setup:

```bash
# Initialize Governance methodology in any project
npx github:muathrabuouda/ai-governance init "My Project"

# Check project governance status & policy gates
npx github:muathrabuouda/ai-governance check

# View governance status summary & ADRs
npx github:muathrabuouda/ai-governance status

# Formally approve and lock acceptance criteria
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

## Architecture & Verification Model

### 1. Specification Integrity & State Guardian

Autonomous AI agents with filesystem write access can inadvertently weaken acceptance criteria in `docs/foundation/02-spec.md` or delete failing tests to achieve a passing build.

AI Governance protects criteria integrity through a multi-tier detection model:

1. **Full-Table Markdown Hashing:** Accurately extracts the complete criteria table (header, separator dashes, and all scenario rows). Any modification to any cell or row immediately alters the story hash.
2. **Backward-Linked Audit Chain:** Every approval, story addition, or deprecation appends a block to `.governance/state.json`. Each block links cryptographically to the preceding block hash:
   $$\text{hash}_n = \text{SHA256}(n + \text{hash}_{n-1} + \text{timestamp} + \text{author} + \text{action} + \text{details} + \text{attestation})$$
3. **Cross-Platform Git Tree Anchoring:** Uses `git log -1 --format="%T"` to extract the Git tree hash reliably across Windows, Linux, and macOS without shell escaping pitfalls.
4. **External Git Notes Anchoring:** Stores the latest state head anchor outside the working tree in Git's object database under `refs/notes/governance`.
5. **Commit Signature Attestation:** Captures commit signature verification status (`git log -1 --format="%G?"`) documenting whether commits were signed with verified GPG/SSH keys.
6. **Production Repository Protection:** In collaborative environments, local Git anchors are complemented by GitHub Branch Protection rules (disallowing force-pushes and requiring CI checks to pass before merging).

### 2. Policy-Driven Execution Engine (`policy.json`)

Verification rules are declared in `.governance/policy.json`, allowing teams to customize requirements across three standard profiles:
- `strict`: All gates required; fails on any warning; requires test suites and clean Git history.
- `standard`: Core security, specification, test suite, and dependency gates required; linters and formatters advise with warnings.
- `lenient`: Permissive profile for rapid prototyping and initial project bootstrapping.

#### Truthful Gate Outcome Taxonomy
Instead of conflating skipped steps with passed results, every gate outputs an explicit, truthful status:
- `PASSED` (`[PASS]`): Gate executed and satisfied all acceptance criteria.
- `FAILED` (`[FAIL]`): Gate executed and failed checks.
- `SKIPPED` (`[SKIP]`): Optional gate skipped intentionally with documented justification.
- `NOT_CONFIGURED` (`[NOT CONFIGURED]`): Tool or runner not configured in active stack (evaluated per `on_missing` policy).
- `REQUIRES_REVIEW` (`[WARN]`): Informational gate requiring human review.

### 3. Verdict & Traceability Engine (`.governance/evidence/`)

Every execution of `governance check` generates reproducible evidence in `.governance/evidence/`:
1. **`verdict.json`:** Machine-readable compliance ledger signed with a SHA-256 digest, capturing committer identity, Git commit SHA, tree hash, policy profile, and full gate outcomes (`APPROVED` | `REJECTED` | `REQUIRES_REVIEW`).
2. **`report.md`:** Clean markdown executive report with truthful status badges for pull request reviews and compliance audits.
3. **`traceability.json`:** Requirement-to-code mapping linking user stories to implementation files, automated test suites, and STRIDE threat models.

Inspect the latest verdict or traceability matrix at any time:
```bash
governance verdict
governance trace
```

### 4. Agent Governance & Control Plane (`.governance/agent-contract.json`)

To prevent autonomous coding agents from exceeding their mandate, AI Governance establishes an explicit **Agent Governance Contract**:
- **Protected Paths:** Rejects agent edits to `.governance/state.json`, `.governance/policy.json`, `.governance/agent-contract.json`, `docs/foundation/adr/**`, and `LICENSE.md`.
- **Forbidden Actions:** Restricts agents from deleting test files, disabling assertions, or tampering with governance configurations.
- **Working Tree Audit:** Run `governance agent:audit` to verify uncommitted working tree changes against permission boundaries before committing.

```bash
# Audit workspace changes against agent contract
governance agent:audit

# Initialize default agent contract
governance agent:init
```

---

## Governance CLI Reference

```bash
governance <command> [options]
```

| Command | Description |
| :--- | :--- |
| `check [--profile=...]` | Multi-stack verification pipeline enforcing all 9 policy gates (strict, standard, lenient). |
| `verdict` | Displays the latest cryptographic governance verdict and audit proof summary. |
| `trace [story]` | Displays the requirement-to-code and test traceability matrix. |
| `agent:audit` | Audits working tree changes against Agent Governance Contract rules and protected paths. |
| `agent:init [--force]` | Initializes or resets the Agent Governance Contract (`.governance/agent-contract.json`). |
| `status` | Summarizes project governance status, registered ADRs, and active story progression. |
| `init [title] [--force]` | Initializes the full 3-pillar methodology documentation suite safely. |
| `approve:spec [name] [--prune]` | Formally approves and cryptographically locks Acceptance Criteria into `.governance/state.json`. |
| `deprecate:story <id> [reason]` | Deprecates an approved story in the audit ledger and spec with reason tracking. |
| `new:adr <title>` | Records a new Architecture Decision Record in `docs/foundation/adr/`. |
| `list:adr` | Lists all Architecture Decision Records and their statuses. |
| `new:story <id> <title>` | Scaffolds a new user story with acceptance criteria (prevents duplicates). |
| `new:threat <id> [title]` | Creates a story-level STRIDE threat model in `docs/lifecycle/threat-model/`. |
| `rules` | Generates managed AI agent instructions (`.cursorrules`, `CLAUDE.md`, Copilot). |
| `install:hooks` | Installs Git pre-commit verification hook (preserves existing hooks with real exit codes). |
| `install:ci` | Generates stack-aware GitHub Actions workflow (`.github/workflows/governance-gate.yml`) with Gitleaks. |
| `audit:git` | Audits git commits against Conventional Commits standards. |
| `audit:design` | Audits UI templates for Design System rules (70-20-10 distribution, accent-only green). |
| `secrets` | Scans repository for exposed API keys, private tokens, and credentials. |
| `deps` | Verifies that all dependencies are strictly pinned and security-approved. |
| `map` | Generates a structured repository architectural map (`docs/repo-map.md`). |
| `prompt [phase]` | Displays engineering prompts across the 13 methodology phases (00 to 12). |

---

## Author & Vision

* **Muath R Abu Ouda** — Lead Architect & Creator ([GitHub](https://github.com/muathrabuouda))
* Built for developers and autonomous agents committed to rigorous software verification.

## License

AI Governance is open-sourced software licensed under the [MIT license](LICENSE.md).
