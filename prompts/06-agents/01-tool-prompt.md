# Custom Agent Tool Prompt

**AI Agent Architecture** · "Tools, Protocols, Personas, and Guardrails" · Agent CLI Tools

```text
Create a CLI utility script that performs [task] for the agent.
Requirements:
1. Single responsibility: does one task well.
2. Output formatted for consumption by an LLM (concise, structured, zero noise).
3. Exit code 0 on success, non-zero on failure with concise stderr.
Show me the script and test it before adding to documentation.
```
