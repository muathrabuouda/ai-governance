# Lessons — long-term memory for agents and people

Each entry: what we learned, when, and how to check it is still true.
Delete an entry when its check fails. A stale lesson is worse than none.

| Date       | Lesson                                                                                        | Still true if                                      |
| ---------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 2026-11-09 | Test runner needs the glob quoted: tsx --test "tests/\*_/_.test.ts"                           | npm test passes                                    |
| 2026-11-09 | Arabic search must go through normalizeArabic; never compare raw strings                      | grep -r "normalizeArabic" src shows one definition |
| 2026-11-16 | Late-cancel window is 24 hours (LATE_CANCEL_HOURS) — set by the clinic owner                  | domain.ts still exports LATE_CANCEL_HOURS = 24     |
| 2026-11-23 | Tests at round numbers miss boundaries: add a case exactly AT every limit (24h, now)          | npm run mutate shows 0 survivors in booking        |
| 2026-11-23 | Agents suggest packages that do not exist; every dependency goes through docs/dependencies.md | npm run deps passes                                |
| 2026-11-30 | Never let a log line carry a phone number; log ids, not people                                | tests/shared/lifecycle.test.ts passes              |
| 2026-11-30 | Roll back first, debug second                                                                 | docs/runbook.md "Roll back" section exists         |
