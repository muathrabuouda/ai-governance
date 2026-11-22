# Definition of Done Audit Prompt (Governance Standard)

> Use this prompt to audit any Pull Request, story, or feature completion before merge.

---

## Instructions for AI Agent

Review the proposed branch or pull request against the **Governance Quality Gate**:

### 1. Verification Pipeline Gate

- Has `node ./bin/governance.mjs check` completed with exit code `0`?
  - Formatting: passes Prettier check.
  - Linting: zero ESLint errors.
  - Typecheck: zero TypeScript compilation issues.
  - Test Suite: 100% of unit, contract, and property tests pass.
  - Localization: all i18n keys and placeholders match across locales.
  - Dependencies: all packages pinned and verified against approval registry.
  - Secrets: zero credentials or secrets detected.

### 2. Architecture & Design System Gate

- Has `node ./bin/governance.mjs audit:git` passed for all commits in the PR?
- Has `node ./bin/governance.mjs audit:design` passed without color or token violations?
- Has any N+1 query issue been verified via `node ./bin/governance.mjs bench`?

### 3. Verification Proof Gate

- Are there contract tests for any external boundaries?
- Did mutation testing (`node ./bin/governance.mjs mutate`) achieve the target score?
- Are all logs structured and properly redacted for PII?
