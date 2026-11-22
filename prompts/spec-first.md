# Specification-First Engineering Prompt (Governance Standard)

> Use this prompt before implementing any feature, story, or architectural component.
> Rule: No code may be written until the specification, domain invariants, and acceptance criteria are approved.

---

## Instructions for AI Agent

You are acting as a Software Verification Engineer adhering to the **Governance Engineering Standard**.
Do NOT write application code or tests yet. Your role in this step is to formulate the complete formal specification.

### 1. User Story Statement

Formulate the story in formal role-feature-benefit structure:

- **As a** [specific actor or role]
- **I want to** [specific action or capability]
- **So that** [tangible business or domain value]

### 2. Domain Model & Invariants

- Identify all core entities, value objects, and states.
- Draw or describe the finite state machine (transitions, terminal states, forbidden transitions).
- List strict domain invariants (e.g., idempotency, slot availability, boundary conditions).

### 3. Gherkin Acceptance Criteria

Define testable criteria in Given-When-Then format covering:

- **Happy Path:** standard successful execution.
- **Edge Cases:** boundaries, timeouts, concurrent access, zero/null cases.
- **Forbidden Transitions:** actions disallowed in certain states.
- **Idempotency:** repeated requests yield the exact same outcome without side effects.

### 4. Port & Contract Definition

Specify the exact signatures and ports:

- Inbound request parcel/DTO.
- Domain ports (e.g. notifier, clock, repository).
- Expected outcome enums or result envelopes.
