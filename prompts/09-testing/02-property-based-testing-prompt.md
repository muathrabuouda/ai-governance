# Property-Based Testing Prompt

**Testing & Verification** · "Mutation Testing and Property Invariants" · Invariant Testing

```text
Write property-based tests for [Domain Function] using randomized inputs across hundreds of iterations.
Verify mathematical invariants:
- Idempotence: f(f(x)) === f(x) (e.g. text normalization).
- Round-trip integrity: decode(encode(x)) === x.
- Boundary preservation: invariant properties that must hold true for all valid inputs.
```
