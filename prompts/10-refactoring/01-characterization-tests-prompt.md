# Characterization Tests for Legacy Code Prompt

**Safe Refactoring** · "Change Safely, Measure, Then Deploy" · Legacy Characterization

```text
We need to refactor legacy module [Module Name] which currently lacks tests.
Before changing any code, write Characterization Tests (`tests/legacy/`):
- Treat the legacy code as a black box.
- Call the code with realistic inputs and assert the exact current output, even if suspicious or buggy.
- Pin down the current behavior as a safety baseline before modifying a single line of code.
```
