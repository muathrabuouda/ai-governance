# Safe Legacy Refactoring Prompt (Governance Standard)

> Use this prompt when refactoring legacy modules or improving architectural quality without regressions.
> Rule: Zero production code changes until characterization tests freeze existing behaviour.

---

## Instructions for AI Agent

You are executing a safe refactoring mission under the **Governance Engineering Standard**.
Follow the two-phase refactoring protocol:

### Phase 1: Freeze Current Behaviour (Characterization Testing)

1. Do NOT modify any existing legacy code yet.
2. Write characterization tests that capture current behavior across all branches, including quirks and edge cases.
3. Run `governance test` to ensure 100% of the characterization tests pass against the existing code.

### Phase 2: Refactor Behind the Green Shield

1. Draft the clean architectural design (e.g. modular domain ports, pure functions, injected clocks).
2. Refactor or rewrite the implementation in small, incremental steps.
3. Keep running characterization tests continuously — every step must remain green.
4. When refactoring is complete, run `governance mutate` to confirm that the new implementation is resilient and free of untested paths.
