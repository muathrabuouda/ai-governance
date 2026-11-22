# Approved dependencies

Every dependency is pinned to an exact version and listed here before it is installed.
An agent never adds a row: it proposes one in the pull request, and a person approves it.

| Package           | Version | License    | Why we need it                        | Approved by       |
| ----------------- | ------- | ---------- | ------------------------------------- | ----------------- |
| @types/node       | 22.10.2 | MIT        | Node types for TypeScript             | Muath, 2026-11-02 |
| eslint            | 9.17.0  | MIT        | Lint gate                             | Muath, 2026-11-02 |
| prettier          | 3.4.2   | MIT        | Format gate                           | Muath, 2026-11-02 |
| tsx               | 4.19.2  | MIT        | Runs TypeScript tests without a build | Muath, 2026-11-02 |
| typescript        | 5.7.2   | Apache-2.0 | Type checking                         | Muath, 2026-11-02 |
| typescript-eslint | 8.18.1  | MIT        | TypeScript rules for eslint           | Muath, 2026-11-02 |

## Before you approve a new row

1. The package exists on the registry under exactly this name, and its repository and maintainers look real (not a hallucinated or look-alike name).
2. It is maintained: recent releases, open issues answered.
3. The license is in our allowed list: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC.
4. Nothing we already have, or ten lines of our own code, does the same job.
