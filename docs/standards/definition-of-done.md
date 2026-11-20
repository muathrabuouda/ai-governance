# Definition of Done — a story is done when ALL of these are true

1. Every acceptance criterion has a test named `ac_<story>_<n>` that would fail if the behaviour broke.
2. `npm run check` is green locally and in CI.
3. The mutation run shows no survivor in the changed files, or each survivor is explained in the PR.
4. Expected failures are values (result types); nothing expected is thrown.
5. External systems are reached only through an adapter, and the adapter has a contract test.
6. No new dependency without an approved row in docs/dependencies.md.
7. Arabic and English messages exist for every new user-facing result.
8. The reviewer subagent and one human have reviewed the diff.
9. docs/progress.md is updated; docs/lessons.md if we learned something that will stay true.
