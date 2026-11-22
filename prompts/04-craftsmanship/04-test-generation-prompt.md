# Failing Tests Generation Prompt

**Code Craftsmanship** · "Generation, Review, and Localization" · Test-Driven Verification

```text
Write failing tests for the contract from the previous step.
One test per acceptance criterion, named ac_<story>_<criterion>: <text from criterion>.
Write tests against the contract types only; do not write the implementation yet.
Run `npm test` and verify that all new tests fail because the function throws "not implemented".
```
