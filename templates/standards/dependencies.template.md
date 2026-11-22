# Approved dependencies

Every dependency is pinned to an exact version and listed here before it is installed.
An agent never adds a row: it proposes one in the pull request, and a person approves it.

| Package            | Version       | License       | Why we need it | Approved by                         |
| :----------------- | :------------ | :------------ | :------------- | :---------------------------------- |
| {{PACKAGE_NAME_1}} | {{VERSION_1}} | {{LICENSE_1}} | {{PURPOSE_1}}  | {{APPROVER_1}}, {{APPROVAL_DATE_1}} |
| {{PACKAGE_NAME_2}} | {{VERSION_2}} | {{LICENSE_2}} | {{PURPOSE_2}}  | {{APPROVER_2}}, {{APPROVAL_DATE_2}} |

## Before you approve a new row

1. The package exists on the registry under exactly this name, and its repository and maintainers look real (not a hallucinated or look-alike name).
2. It is maintained: recent releases, open issues answered.
3. The license is in our allowed list: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC.
4. Nothing we already have, or ten lines of our own code, does the same job.
