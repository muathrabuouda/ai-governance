# Mutation Testing Prompt

**Testing & Verification** · "Mutation Testing and Property Invariants" · Testing the Test Suite

```text
Write a mutation testing script (`scripts/mutate.mjs`) that tests the test suite:
- Deliberately inject logical mutations into domain code: invert boundary conditions (< to <=), invert boolean checks, disable idempotency checks, remove event dispatches.
- Run the test suite against each mutant. If tests pass, the mutant "survived" (indicating a gap in test coverage).
- Calculate the mutation score (killed / total). Target: 100% mutation kill rate.
```
