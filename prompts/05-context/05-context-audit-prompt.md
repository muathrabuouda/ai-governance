# Context Rules Audit Prompt

**Context Engineering** · "The Minimum Correct Context Suffices" · Rulebook Audit

```text
Audit our rules file (`AGENTS.md`) against context hygiene standards:
1. Are there rules describing what is already obvious from the code or type system?
2. Are there rules that can be enforced by a linter, typechecker, or git hook instead of wasting context?
3. What is the total token count of root rules loaded on every prompt?
Give me recommendations to reduce context overhead without sacrificing safety.
```
