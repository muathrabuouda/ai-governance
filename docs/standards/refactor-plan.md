# Refactoring plan — legacy daily report

Goal: same output, readable code, typed rows, glossary names. Behaviour changes are NOT part of this work.

| Step | What                                                              | Proven by                                        | Status |
| ---- | ----------------------------------------------------------------- | ------------------------------------------------ | ------ |
| 0    | Characterization tests on the legacy function, as it is           | 4 tests pass on the untouched code               | done   |
| 1    | New module src/modules/reports/daily.ts: summariseDay + renderDay | Same 4 tests, run against the legacy entry point | done   |
| 2    | Legacy function delegates to the new module (callers unchanged)   | Same 4 tests                                     | done   |
| 3    | Move callers to the new module, delete src/legacy/daily-report.ts | Same 4 tests, pointed at the new module          | next   |

## Questions found while refactoring (for the clinic owner, NOT fixed here)

- Times are printed in UTC, not clinic time (Asia/Jerusalem). Bug or intended?
- Completed visits are not counted anywhere in the report. Should they be?
  Each answer becomes a story with its own acceptance criteria and its own tests.
