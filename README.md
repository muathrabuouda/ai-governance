# AI Governance

> **"No code without proof"**  
> **The AI-Native Software Engineering & Verification Platform**  
> _Authored by Muath R Abu Ouda <muathrabuouda@hotmail.com>_

---

## Overview

**AI Governance** (codenamed **Governance** / `ai-governance-engine`) is an architectural verification engine and command-line harness designed to govern the end-to-end software engineering lifecycle when collaborating with autonomous AI agents.

In modern AI-assisted engineering, code generation is rapid, but verification and architectural trust are paramount. AI Governance ensures that every feature, boundary, contract, and decision is backed by verifiable proof:

- **Specification-First Governance:** Domain models, ADRs, and acceptance criteria defined before code generation.
- **Context Engineering:** Calibrated token budgets, architectural repository maps, and scoped agent rulebooks (`AGENTS.md`).
- **Trust & Verification:** Mutation testing, contract testing, property-based testing, and secret leak scanning.
- **Agent Guardrails:** Active hooks preventing unauthorized alterations to tests and safety constraints.
- **Performance Contracts:** Automated benchmarks detecting N+1 regressions and query explosions.

---

## Installation & Quick Start

Run instantly anywhere via `npx` directly from GitHub without cloning or manual setup:

```bash
# Initialize Governance 3-pillar methodology in any project (Android, iOS, Web, Backend)
npx github:muathrabuouda/ai-governance init "My Project"

# Check project governance status & ADRs
npx github:muathrabuouda/ai-governance status

# Record a new Architecture Decision Record (ADR)
npx github:muathrabuouda/ai-governance new:adr "Adopt Clean Architecture"

# Scaffold a new User Story with Acceptance Criteria
npx github:muathrabuouda/ai-governance new:story 1 "User Authentication"

# Generate agent instruction rules (.cursorrules, CLAUDE.md, Copilot)
npx github:muathrabuouda/ai-governance rules

# Install Git pre-commit enforcement hooks
npx github:muathrabuouda/ai-governance install:hooks
```

Or install globally on your development machine:

```bash
npm install -g github:muathrabuouda/ai-governance
governance --help
```

---

## Governance CLI (`governance`)

The CLI provides unified access to all software verification tools:

```bash
governance <command> [options]
```

### Available Commands

| Command | Description |
| :--- | :--- |
| `check` | Multi-stack verification pipeline (Stack test suite, Pint/Prettier format, Static analysis, Secrets scan, Conventional commits, Acceptance Criteria lock). |
| `status` | Summarizes project governance status, registered ADRs, and active story progression. |
| `init [title] [--force]` | Initializes the full 3-pillar methodology documentation suite (safe by default, preserves existing files). |
| `new:adr <title>` | Records a new Architecture Decision Record in `docs/foundation/adr/`. |
| `list:adr` | Lists all Architecture Decision Records and their statuses. |
| `new:story <id> <title>` | Scaffolds a new user story with acceptance criteria (prevents duplicates). |
| `new:threat <id> [title]` | Creates a story-level STRIDE threat model in `docs/lifecycle/threat-model/`. |
| `rules` | Generates managed AI agent instructions (`.cursorrules`, `CLAUDE.md`, Copilot) with safe block merging. |
| `install:hooks` | Installs Git pre-commit verification hook (preserves existing hooks and enforces real exit codes). |
| `install:ci` | Generates an unbypassable GitHub Actions CI/CD governance workflow (`.github/workflows/governance-gate.yml`). |
| `audit:git` | Audits git commits against Conventional Commits standards. |
| `audit:design` | Audits UI templates for Design System rules (70-20-10 distribution, accent-only green). |
| `secrets` | Scans repository for exposed API keys, private tokens, and credentials. |
| `deps` | Verifies that all dependencies are strictly pinned and security-approved. |
| `map` | Generates a structured repository architectural map (`docs/repo-map.md`). |
| `prompt [phase]` | Displays engineering prompts across the 13 methodology phases (00 to 12). |

---

## The 13-Stage AI Engineering Methodology

AI Governance includes a complete prompt library for guiding autonomous agents through structured engineering stages:

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
