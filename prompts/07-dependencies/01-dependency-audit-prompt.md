# Dependency Security & Integrity Audit Prompt

**External Dependencies** · "Vetting, Adapters, and Offline Contracts" · Dependency Audit

```text
Audit the dependencies of this repository:
1. Verify that all dependencies are strictly pinned to exact versions without loose ranges (^ or ~).
2. Check against our approved registry in `docs/standards/dependencies.md`.
3. Flag any indirect or unvetted dependency.
4. Write a script `scripts/check-deps.mjs` that enforces this check in CI.
```
