# Changelog

All notable changes to `@muathrabuouda/ai-governance` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.01.02](https://github.com/muathrabuouda/ai-governance/releases/tag/v1.01.02) - 2026-11-28

### Added

- Active Execution Gateway (`scripts/gateway.mjs`) providing real-time pre-execution interception of agent file mutations, shell commands, and package installations with structured audit logging to `.governance/evidence/agent-execution.log`.
- Real-time CLI execution commands: `governance exec` and `governance agent:log`.
- 5-stage Semantic Verification Lifecycle (`PENDING` -> `REFERENCED` -> `BOUND` -> `TESTED` -> `PASSED`) in traceability matrix with test report parsing for Node.js, Jest, Vitest, and Pest.
- Automatic GPG binary resolution (`resolveGpgBinary`) leveraging Git configuration (`git config gpg.program`) and system locations.
- Genuine detached GPG evidence verification (`verdict.json.asc`) validating signer key fingerprints against `authorized-approvers.json`.

### Fixed

- Enforced fail-closed Git tag creation in strict mode: aborts with fatal error rather than degrading silently to unsigned tags.
- Eliminated all ESLint warnings and formatting issues across the entire codebase.
- Configured `.prettierignore` to protect cryptographically signed specification and ledger files.

## [v1.00.00](https://github.com/muathrabuouda/ai-governance/releases/tag/v1.00.00) - 2026-11-22

### Added

- Initial production release of AI Governance (`@muathrabuouda/ai-governance`).
- Architectural Verification Engine & Command-Line Harness (`governance` / `governance` CLI).
- Specification-First Architecture with formal ADR, Domain, and Spec workflows.
- Agent safety hooks for test suite protection (`protect-tests.mjs`) and commit enforcement (`check-commit-msg.mjs`).
- Automated Design System Auditor enforcing 70-20-10 palette and background invariants.
- Model Context Protocol (MCP) Stories server for agent context provisioning.
- 13-stage AI software engineering methodology prompt library (phases 00 to 12).
- Golden reference application showcasing hexagonal boundaries, mutation testing, and benchmark contracts.
- Automated pipeline verifications: secret scanning, pinned dependencies gate, and Conventional Commits audit.
