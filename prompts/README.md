# AI Software Engineering Prompts Catalog

> **"No code without proof"**  
> Complete collection of structured engineering prompts across all 13 phases of AI-assisted software development, arranged sequentially from foundational prompt design to production lifecycle governance.

In each prompt, bracketed items (`[ ]`) denote placeholders for your specific context. Every prompt stops at a critical human decision gate: the engineering decision is yours.

```
Contract First  →  Failing Test per Criterion  →  Minimal Code  →  Verification Gate  →  Independent Review
```

---

## 00. Foundations · The Prompt as a Micro-Specification

> _"Every model output is a draft until verified"_

| Prompt                                                                                              | Description                                                                         |
| :-------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------- |
| [01-robust-prompting-user-registration.md](00-foundations/01-robust-prompting-user-registration.md) | High-leverage prompt establishing concrete constraints and six boundary test cases. |

---

## 01. Requirements Engineering · Specifications and Acceptance Criteria

> _"Have the model question you rather than guess"_

| Prompt                                                                                 | Description                                                                                          |
| :------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------- |
| [01-interviewer-prompt-example.md](01-requirements/01-interviewer-prompt-example.md)   | Socratic requirements extraction across user roles, happy path, failure modes, and scope boundaries. |
| [02-interviewer-prompt-template.md](01-requirements/02-interviewer-prompt-template.md) | Reusable requirements interview template for new systems.                                            |
| [03-requirements-review-prompt.md](01-requirements/03-requirements-review-prompt.md)   | Sceptical QA review uncovering untestable criteria, ambiguities, and contradictions.                 |

---

## 02. Domain Modeling · Entities, Value Objects & Finite State Machines

> _"The model reads, the engineer crafts"_

| Prompt                                                                                        | Description                                                                             |
| :-------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------- |
| [01-domain-model-draft-and-review.md](02-domain-modeling/01-domain-model-draft-and-review.md) | ER diagram in Mermaid and explicit catalog of domain invariants and enforcement layers. |
| [02-consistency-matrix.md](02-domain-modeling/02-consistency-matrix.md)                       | CRUD consistency matrix aligning user stories with domain entities.                     |

---

## 03. Software Architecture · Decisions Cannot Be Delegated

> _"Decisions are permanent; code is transient"_

| Prompt                                                                           | Description                                                                       |
| :------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------- |
| [01-devils-advocate-prompt.md](03-architecture/01-devils-advocate-prompt.md)     | Adversarial architectural critique of Architecture Decision Records (ADRs).       |
| [02-architecture-plan-prompt.md](03-architecture/02-architecture-plan-prompt.md) | Initial architectural skeleton and story implementation plan before writing code. |
| [03-execution-prompt.md](03-architecture/03-execution-prompt.md)                 | Controlled, step-by-step architectural execution with mandatory stop conditions.  |

---

## 04. Code Craftsmanship · Contract-First & Independent Review

> _"Types first, failing tests second, minimal implementation third"_

| Prompt                                                                                      | Description                                                                                |
| :------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------- |
| [01-contract-prompt-example.md](04-craftsmanship/01-contract-prompt-example.md)             | Contract-first signature and error types specification (Story 4: Cancel Appointment).      |
| [02-independent-reviewer-example.md](04-craftsmanship/02-independent-reviewer-example.md)   | Sceptical independent code reviewer persona auditing pull request diffs.                   |
| [03-contract-prompt-template.md](04-craftsmanship/03-contract-prompt-template.md)           | Reusable contract-first prompt template for any user story.                                |
| [04-test-generation-prompt.md](04-craftsmanship/04-test-generation-prompt.md)               | Generating failing tests per acceptance criterion against contract types.                  |
| [05-implementation-prompt.md](04-craftsmanship/05-implementation-prompt.md)                 | Minimal green step implementation without modifying tests or adding unvetted dependencies. |
| [06-independent-reviewer-template.md](04-craftsmanship/06-independent-reviewer-template.md) | Reusable pull request review template with blocker/important/suggestion severities.        |
| [07-localization-prompt.md](04-craftsmanship/07-localization-prompt.md)                     | Multilingual localization, 6-category plural forms, and logical layout properties.         |

---

## 05. Context Engineering · Minimum Correct Context

> _"The smallest correct context suffices; excess context breeds hallucinations"_

| Prompt                                                                          | Description                                                                           |
| :------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------ |
| [01-context-measurement-prompt.md](05-context/01-context-measurement-prompt.md) | Live token window measurement and tier distribution analysis.                         |
| [02-needle-in-haystack-prompt.md](05-context/02-needle-in-haystack-prompt.md)   | Needle-in-a-haystack retrieval accuracy test across large code bases.                 |
| [03-repo-map-prompt.md](05-context/03-repo-map-prompt.md)                       | Script generating structured architectural repository map with zero new dependencies. |
| [04-exploration-prompt.md](05-context/04-exploration-prompt.md)                 | Targeted exploratory queries mapping business rules to source files without editing.  |
| [05-context-audit-prompt.md](05-context/05-context-audit-prompt.md)             | Context hygiene audit eliminating redundant rules and optimizing root tokens.         |
| [06-session-1-search.md](05-context/06-session-1-search.md)                     | Multi-session protocol — Session 1: Exploration and data flow tracing.                |
| [07-session-2-plan.md](05-context/07-session-2-plan.md)                         | Multi-session protocol — Session 2: Step-by-step plan and human approval gate.        |
| [08-session-3-execution.md](05-context/08-session-3-execution.md)               | Multi-session protocol — Session 3: Controlled execution and verification.            |

---

## 06. AI Agent Architecture · Tools, MCP, Skills & Guardrails

> _"Augment agents with protocol-driven tools and enforce inviolable boundaries"_

| Prompt                                                         | Description                                                                           |
| :------------------------------------------------------------- | :------------------------------------------------------------------------------------ |
| [01-tool-prompt.md](06-agents/01-tool-prompt.md)               | Single-responsibility CLI utility formatted for agent consumption.                    |
| [02-mcp-server-prompt.md](06-agents/02-mcp-server-prompt.md)   | JSON-RPC Model Context Protocol (MCP) server exposing tools over stdio.               |
| [03-skill-prompt.md](06-agents/03-skill-prompt.md)             | Reusable multi-step agent skill workflow definition in `.agents/skills/`.             |
| [04-subagent-prompt.md](06-agents/04-subagent-prompt.md)       | Specialized subagent persona with restricted tools and objective review rules.        |
| [05-safety-hook-prompt.md](06-agents/05-safety-hook-prompt.md) | Pre-tool execution hook enforcing immutability of existing automated test assertions. |
| [06-exercise-steps.md](06-agents/06-exercise-steps.md)         | Step-by-step workshop walkthrough for agent tooling architecture.                     |

---

## 07. External Dependencies · Vetting, Adapters & Offline Contracts

> _"Isolate the external world; verify through offline consumer-driven contracts"_

| Prompt                                                                         | Description                                                                               |
| :----------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------- |
| [01-dependency-audit-prompt.md](07-dependencies/01-dependency-audit-prompt.md) | Strict dependency pinning and registry compliance check.                                  |
| [02-adapter-wrapper-prompt.md](07-dependencies/02-adapter-wrapper-prompt.md)   | Clean adapter wrapping third-party services with injected HTTP client and retry policies. |
| [03-contract-test-prompt.md](07-dependencies/03-contract-test-prompt.md)       | Offline consumer-driven contract testing against JSON schemas without external networks.  |

---

## 08. Quality Pipelines · Continuous Integration & Verification Gates

> _"No code merges without passing all automated quality gates"_

| Prompt                                                          | Description                                                                              |
| :-------------------------------------------------------------- | :--------------------------------------------------------------------------------------- |
| [01-ci-pipeline-prompt.md](08-quality/01-ci-pipeline-prompt.md) | Complete 6-stage CI verification gate (format, lint, types, tests, i18n, deps, secrets). |

---

## 09. Testing & Mutation · Testing the Test Suite

> _"Tests that never fail prove nothing: kill mutants to measure true confidence"_

| Prompt                                                                                | Description                                                                        |
| :------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------- |
| [01-mutation-testing-prompt.md](09-testing/01-mutation-testing-prompt.md)             | Deliberate logical fault injection measuring test suite mutation kill score.       |
| [02-property-based-testing-prompt.md](09-testing/02-property-based-testing-prompt.md) | Property-based testing verifying mathematical invariants across randomized inputs. |
| [03-regression-protection-prompt.md](09-testing/03-regression-protection-prompt.md)   | Defect reproduction test suite ensuring bugs never return.                         |

---

## 10. Safe Refactoring · Characterization & Strangler Fig

> _"Characterize current behavior before changing a single line"_

| Prompt                                                                                        | Description                                                                           |
| :-------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------ |
| [01-characterization-tests-prompt.md](10-refactoring/01-characterization-tests-prompt.md)     | Black-box characterization tests pinning down existing legacy behavior as a baseline. |
| [02-refactor-plan-prompt.md](10-refactoring/02-refactor-plan-prompt.md)                       | Incremental Strangler Fig modernization roadmap.                                      |
| [03-step-by-step-refactoring-prompt.md](10-refactoring/03-step-by-step-refactoring-prompt.md) | Atomic refactoring execution verified against characterization and unit tests.        |

---

## 11. Performance & Security · Benchmarking & Threat Modeling

> _"Measure before optimizing; model threats before shipping"_

| Prompt                                                                         | Description                                                                  |
| :----------------------------------------------------------------------------- | :--------------------------------------------------------------------------- |
| [01-benchmark-prompt.md](11-performance-security/01-benchmark-prompt.md)       | Automated query benchmark eliminating N+1 database roundtrips.               |
| [02-threat-model-prompt.md](11-performance-security/02-threat-model-prompt.md) | STRIDE security threat analysis identifying controls and verification tests. |

---

## 12. Lifecycle & Operations · Canary Delivery & Runbooks

> _"Change safely, measure continuously, rollback automatically"_

| Prompt                                                                            | Description                                                                 |
| :-------------------------------------------------------------------------------- | :-------------------------------------------------------------------------- |
| [01-deployment-pipeline-prompt.md](12-lifecycle/01-deployment-pipeline-prompt.md) | Continuous delivery workflow with staging smoke tests and canary rollouts.  |
| [02-feature-flag-prompt.md](12-lifecycle/02-feature-flag-prompt.md)               | Stable percentage feature flag rollout based on cryptographic user hashing. |
