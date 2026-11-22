# AGENTS.md — Supreme Agent Behavioral Constitution & Engineering Platform

> **"No code without proof"** — _AI-Native Software Engineering & Verification Platform_  
> Authored by Muath R Abu Ouda <muathrabuouda@hotmail.com>.

Docs Index: [docs/index.md](docs/index.md) (open only what the task needs) · Repo Map: [docs/lifecycle/repo-map.md](docs/lifecycle/repo-map.md)  
Golden Reference Application: [golden-project/](golden-project/README.md) (isolated domain implementation)

---

## 1. Constitutional Laws (Non-Negotiable)

1. **Zero Unilateral Git Actions:** AI agents must NEVER run `git commit`, `git push`, or alter remote repository states without an explicit instruction from the user.
2. **English-Only Codebase:** All code DocBlocks, comments, commit messages, documentation, templates, and prompts must be written exclusively in 100% technical English.
3. **Specification Before Implementation:** Never write production domain code without formal acceptance criteria (`docs/foundation/02-spec.md`) and a threat model (`docs/lifecycle/threat-model/`).
4. **Errors as Values:** Expected domain failures must be modeled as typed Result Types (`Result<T, E>`), never thrown as runtime exceptions.
5. **Hexagonal Boundary Law:** Domain logic must never import framework routers, raw databases, or external network clients. All external interactions must pass through explicit Port interfaces.
6. **Design System & Semantic Palette (70-20-10):**
   - 70% Neutral Canvas/Surfaces (`--color-canvas`, `--color-surface`).
   - 25% Content/Typography (`--color-ink`, `--color-graphite`).
   - 5% Accent/Interactive Focus (`--color-accent`).
   - **Invariant:** The Accent color is an interactive trigger, NEVER a full canvas background.
7. **No Deletion of Existing Tests:** Agent hooks in `.agents/hooks/` actively protect test suites. A failing test must be resolved by fixing the code, not by deleting or weakening the test.
8. **Dependencies Pinned & Approved:** An agent must never install an unapproved package. Every dependency must be pinned to an exact version in `docs/standards/dependencies.md`.

---

## 2. Context Loading Hierarchy (Stable First, Changing Last)

When approaching any task, always load context in this sequence to optimize token caches and prevent hallucinations:

1. `AGENTS.md` (Rules and constraints).
2. `docs/index.md` & `docs/lifecycle/repo-map.md` (Architecture map).
3. `docs/foundation/03-domain.md` (Glossary, entities, and state machines).
4. `docs/foundation/02-spec.md` (Specific user story requirements).
5. `docs/lifecycle/progress.md` (Current iteration state).

---

## 3. The 6-Stage Operational Protocol

1. **Explore:** Discover patterns, boundaries, and acceptance criteria without editing code.
2. **Specify:** Document the ADR, user story, and threat model.
3. **Test:** Write characterization, property-based, or unit tests before feature logic.
4. **Implement:** Write minimal, decoupled domain code fulfilling the specification.
5. **Verify:** Execute `npm run check` (audit, mutation, benchmarks, and secrets).
6. **Refactor:** Streamline without breaking existing test suites.
