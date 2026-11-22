# Agent Extensions Workshop Guide

**AI Agent Architecture** · "Tools, Protocols, Personas, and Guardrails" · Workshop Steps

1. **Step 1 — Standalone CLI Tool:** Write and verify an automated story inspection script.
2. **Step 2 — MCP Protocol Server:** Wrap the tool into an stdio MCP server for agent discovery.
3. **Step 3 — Agent Skill:** Author a reusable, multi-step execution workflow in `.agents/skills/`.
4. **Step 4 — Subagent Persona:** Define an independent, sceptical code reviewer subagent.
5. **Step 5 — Execution Hook:** Enforce immutability of test files using pre-tool validation hooks.
