# Refactoring plan — {{TARGET_COMPONENT_OR_MODULE}}

Goal: {{REFACTOR_GOAL}}

| Step | What                                                            | Proven by                                      | Status |
| :--- | :-------------------------------------------------------------- | :--------------------------------------------- | :----- |
| 0    | Characterization tests on the legacy function, as it is         | {{CHARACTERIZATION_TESTS_PROOF}}               | done   |
| 1    | New module {{NEW_MODULE_PATH}}: {{KEY_FUNCTIONS}}               | Same tests, run against the legacy entry point | done   |
| 2    | Legacy function delegates to the new module (callers unchanged) | Same tests                                     | done   |
| 3    | Move callers to the new module, delete {{OLD_FILE_PATH}}        | Same tests, pointed at the new module          | next   |

## Questions found while refactoring (for the domain owner, NOT fixed here)

- {{REFACTORING_QUESTION_1}}
- {{REFACTORING_QUESTION_2}}
  Each answer becomes a story with its own acceptance criteria and its own tests.
