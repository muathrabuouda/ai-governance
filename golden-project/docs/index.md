# Documentation Index & Architecture Map

> **Governance 3-Pillar Documentation Structure**  
> _Read this first; open only what the task needs._

---

## 1. Foundation (`docs/foundation/`) — System-Level Definition

Foundational documents defining the whole product, its domain models, and architecture:

| Document                             | Purpose & When to Read                                                           |
| :----------------------------------- | :------------------------------------------------------------------------------- |
| `docs/foundation/01-brief.md`        | Problem statement, target vision, and strict in-scope / out-of-scope boundaries. |
| `docs/foundation/02-spec.md`         | Formal specifications, user stories catalog, and Gherkin acceptance criteria.    |
| `docs/foundation/03-domain.md`       | Domain models, entities, value objects, invariants, and Finite State Machine.    |
| `docs/foundation/04-architecture.md` | System topology, modular boundaries, ports, and adapters.                        |
| `docs/foundation/adr/`               | Architecture Decision Records capturing permanent system choices.                |

---

## 2. Lifecycle (`docs/lifecycle/`) — Active Execution & Memory

Living documents tracking agent progress, working memory, and story-level threat models:

| Document                          | Purpose & When to Read                                                                  |
| :-------------------------------- | :-------------------------------------------------------------------------------------- |
| `docs/lifecycle/progress.md`      | Short-term memory: active story in progress, completed milestones, immediate next step. |
| `docs/lifecycle/lessons.md`       | Long-term memory: immutable lessons, discovered traps, and rules never to violate.      |
| `docs/lifecycle/threat-model/`    | Per-story security threat models (assets at risk, attack vectors, mitigations).         |
| `docs/lifecycle/context-order.md` | Agent token context prioritization order.                                               |
| `docs/lifecycle/repo-map.md`      | Generated architectural map of the codebase.                                            |

---

## 3. Standards (`docs/standards/`) — Quality & Operations

Engineering gates, compliance checklists, and operational runbooks:

| Document                               | Purpose & When to Read                                                                             |
| :------------------------------------- | :------------------------------------------------------------------------------------------------- |
| `docs/standards/definition-of-done.md` | The Quality Gates required before any code can be declared finished or merged.                     |
| `docs/standards/git-workflow.md`       | Conventional Commits, branch naming conventions, atomic commit rules, and PR standards.            |
| `docs/standards/design-system.md`      | 70-20-10 color palette rules, accent-not-background invariant, typography, and RTL/LTR tokens.     |
| `docs/standards/agent-lifecycle.md`    | The 6-stage operational protocol (context, threat modeling, TDD, mutation, audit, memory).         |
| `docs/standards/coding-standards.md`   | Result types instead of throws, hexagonal ports/adapters, repository isolation, and PII redaction. |
| `docs/standards/dependencies.md`       | Security-approved and pinned dependency registry.                                                  |
| `docs/standards/delivery-metrics.md`   | Software delivery lead time, cycle time, and verification metrics.                                 |
| `docs/standards/runbook.md`            | Production operations, triage guides, and health alerts.                                           |
| `docs/standards/refactor-plan.md`      | Legacy code strangler plans and refactoring guidelines.                                            |
