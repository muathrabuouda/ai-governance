# Git Workflow & Version Control Standards

> **Governance Standards Document:** Rules for commits, branches, pull requests, and version history.

---

## 1. Commit Message Standard (Conventional Commits)

Every commit message must follow the Conventional Commits specification:

```
<type>(<scope>): <short summary>

[optional body explaining why this change was made and what was done]

[optional footer referencing issue or story ID]
```

### Allowed Types

| Type       | When to Use                                                 | Example                                                   |
| :--------- | :---------------------------------------------------------- | :-------------------------------------------------------- |
| `feat`     | A new user-facing capability or domain feature              | `feat({{SAMPLE_SCOPE}}): {{SAMPLE_FEAT_SUMMARY}}`         |
| `fix`      | A bug fix or boundary correction                            | `fix({{SAMPLE_SCOPE}}): {{SAMPLE_FIX_SUMMARY}}`           |
| `refactor` | Code restructuring without altering existing behavior       | `refactor({{SAMPLE_SCOPE}}): {{SAMPLE_REFACTOR_SUMMARY}}` |
| `test`     | Adding missing tests, property tests, or test harness fixes | `test({{SAMPLE_SCOPE}}): {{SAMPLE_TEST_SUMMARY}}`         |
| `docs`     | Documentation, templates, or ADR updates                    | `docs({{SAMPLE_SCOPE}}): {{SAMPLE_DOCS_SUMMARY}}`         |
| `chore`    | Maintenance, build script updates, or lint adjustments      | `chore({{SAMPLE_SCOPE}}): {{SAMPLE_CHORE_SUMMARY}}`       |
| `perf`     | A performance improvement with benchmark evidence           | `perf({{SAMPLE_SCOPE}}): {{SAMPLE_PERF_SUMMARY}}`         |
| `build`    | Changes to build configuration or package tooling           | `build({{SAMPLE_SCOPE}}): {{SAMPLE_BUILD_SUMMARY}}`       |

### Formatting Rules

1. **Imperative mood:** Use "add", "fix", "refactor" (not "added", "fixing", "fixes").
2. **Lower case:** Summary line starts with a lowercase letter and has no trailing period.
3. **Length limit:** Summary line must not exceed 72 characters.
4. **Body requirement:** Commits touching domain logic must include an English body describing the rationale.
5. **No co-mingling:** Never mix automated formatting changes with architectural or business logic changes.

---

## 2. Branch Naming Strategy

Branches must be prefixed with the intent type followed by a concise descriptive slug:

| Branch Pattern             | Intent                                    | Example                                      |
| :------------------------- | :---------------------------------------- | :------------------------------------------- |
| `feat/story-<n>-<slug>`    | Implementing a specific user story        | `feat/story-{{STORY_NUMBER}}-{{STORY_SLUG}}` |
| `fix/<issue-slug>`         | Targeted bug fix or regression repair     | `fix/{{BUG_SLUG}}`                           |
| `refactor/<target-module>` | Structural improvement or strangler phase | `refactor/{{MODULE_SLUG}}`                   |
| `chore/<maintenance-task>` | Tooling, dependency, or config update     | `chore/{{TASK_SLUG}}`                        |

Direct commits to `main` are strictly prohibited in collaborative and production repositories.

---

## 3. Atomic Commits Law

1. **Single Responsibility:** Each commit must encapsulate one logical step. If a commit description needs the word "and", split it into multiple commits.
2. **Green at Every Commit:** Every commit in the history must pass `governance check` independently. Broken intermediate states are forbidden.
3. **Rebase over Merge:** Feature branches should be rebased onto `main` before merging to maintain a clean linear history.

---

## 4. Agent Operational Constraints

- **Zero Unilateral Commits:** AI agents must never run `git commit` or `git push` without an explicit instruction from the user.
- **Unstaged Review:** All modified files must be presented or staged for inspection prior to commit creation.
- **Clean Workspace Verification:** Agents must verify `git status` before and after operations to prevent unintended artifact commits.
