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

| Type       | When to Use                                                 | Example                                                                  |
| :--------- | :---------------------------------------------------------- | :----------------------------------------------------------------------- |
| `feat`     | A new user-facing capability or domain feature              | `feat(booking): implement slot lock and race check`                      |
| `fix`      | A bug fix or boundary correction                            | `fix(scheduling): exclude clinic holidays from free slots`               |
| `refactor` | Code restructuring without altering existing behavior       | `refactor(reports): extract daily summary behind characterization tests` |
| `test`     | Adding missing tests, property tests, or test harness fixes | `test(booking): add boundary test at exact 24h limit`                    |
| `docs`     | Documentation, templates, or ADR updates                    | `docs(standards): codify git workflow rules`                             |
| `chore`    | Maintenance, build script updates, or lint adjustments      | `chore(deps): pin tsx to version 4.19.2`                                 |
| `perf`     | A performance improvement with benchmark evidence           | `perf(scheduling): batch query for multiple doctors`                     |
| `build`    | Changes to build configuration or package tooling           | `build(tsconfig): enable strict null checks`                             |

### Formatting Rules

1. **Imperative mood:** Use "add", "fix", "refactor" (not "added", "fixing", "fixes").
2. **Lower case:** Summary line starts with a lowercase letter and has no trailing period.
3. **Length limit:** Summary line must not exceed 72 characters.
4. **Body requirement:** Commits touching domain logic must include an English body describing the rationale.
5. **No co-mingling:** Never mix automated formatting changes with architectural or business logic changes.

---

## 2. Branch Naming Strategy

Branches must be prefixed with the intent type followed by a concise descriptive slug:

| Branch Pattern             | Intent                                    | Example                         |
| :------------------------- | :---------------------------------------- | :------------------------------ |
| `feat/story-<n>-<slug>`    | Implementing a specific user story        | `feat/story-2-book-slot`        |
| `fix/<issue-slug>`         | Targeted bug fix or regression repair     | `fix/late-cancel-hour-boundary` |
| `refactor/<target-module>` | Structural improvement or strangler phase | `refactor/legacy-daily-report`  |
| `chore/<maintenance-task>` | Tooling, dependency, or config update     | `chore/update-eslint-config`    |

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

---

## 5. Ugarit Tagging & Versioning Strategy (`xx.xx.xx`)

All repositories across the Ugarit Ecosystem strictly adhere to the unified versioning standard:
`v[MAJOR].[MINOR].[PATCH]` with **mandatory two-digit padding** for minor and patch segments (`xx.xx.xx`).

### Tag Structure & Format
- **Baseline Version:** Starts at `v1.00.00`.
- **Two-Digit Invariant:** Single-digit versions (such as `v1.1.0` or `v1.1.2`) are strictly prohibited and purged.
- **Cryptographic Attestation:** Every release tag must be GPG-signed (`git tag -s`) using the authorized GPG key.

### Per-Commit Version Progression Law
Version tags advance deterministically with each commit according to its Conventional Commit classification:

| Commit Classification | Trigger Condition | Version Transition | Zeroing Rule | Example |
| :--- | :--- | :--- | :--- | :--- |
| **Patch Release** | `fix:`, `chore:`, `test:`, `style:`, `refactor:`, `perf:`, `docs:` | `vM.m.(p+1)` | Increments patch by 1 | `v1.01.01` ➔ `v1.01.02` |
| **Minor Release** | `feat:` or `feat(...):` (new architectural/functional capability) | `vM.(m+1).00` | Increments minor by 1, **resets patch to 00** | `v1.01.04` ➔ `v1.02.00` |
| **Major Release** | `BREAKING CHANGE` or `feat!:` / `fix!:` (breaking API/architecture) | `v(M+1).00.00` | Increments major by 1, **resets minor & patch to 00** | `v1.05.04` ➔ `v2.00.00` |

### Legacy Tag Pruning & Enforcement
- Legacy or upstream tags that deviate from `vXX.XX.XX` (e.g. `v1.1.0`, `v5.x`) must be immediately deleted.
- Automated tag audit and bump commands are provided via `governance tag:audit` and `governance tag:bump`.
