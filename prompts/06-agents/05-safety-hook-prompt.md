# Safety Execution Hook Prompt

**AI Agent Architecture** · "Tools, Protocols, Personas, and Guardrails" · Guardrails & Invariant Hooks

```text
Write a pre-tool execution hook script (`.agents/hooks/protect-tests.mjs`) that intercepts file write operations.
Rule: If the target file is an existing automated test file, exit with code 2 and return a clear error explaining that existing tests may not be modified to make failing code pass.
```
