# Threat model — story {{STORY_NUMBER}}: {{STORY_TITLE}} (one page, 20 minutes, before implementation)

What we protect: {{PROTECTED_ASSETS_DESCRIPTION}}

| Threat (STRIDE)        | How it could happen here     | Control                     | Test or check             |
| :--------------------- | :--------------------------- | :-------------------------- | :------------------------ |
| Spoofing               | {{SPOOFING_SCENARIO}}        | {{SPOOFING_CONTROL}}        | {{SPOOFING_CHECK}}        |
| Tampering              | {{TAMPERING_SCENARIO}}       | {{TAMPERING_CONTROL}}       | {{TAMPERING_CHECK}}       |
| Repudiation            | {{REPUDIATION_SCENARIO}}     | {{REPUDIATION_CONTROL}}     | {{REPUDIATION_CHECK}}     |
| Information disclosure | {{INFO_DISCLOSURE_SCENARIO}} | {{INFO_DISCLOSURE_CONTROL}} | {{INFO_DISCLOSURE_CHECK}} |
| Denial of service      | {{DOS_SCENARIO}}             | {{DOS_CONTROL}}             | {{DOS_CHECK}}             |
| Elevation of privilege | {{PRIVILEGE_SCENARIO}}       | {{PRIVILEGE_CONTROL}}       | {{PRIVILEGE_CHECK}}       |

Questions for the agent-written code review: Is every input validated at the boundary? Is every query parameterised? Does any log or error include personal data?
