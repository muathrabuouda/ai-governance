# How we order what we send to an agent (stable first, changing last)

1. Tools and their descriptions — rarely change
2. Rules: AGENTS.md (+ folder rules) — change weekly at most
3. Docs index, repo map — change when structure changes
4. The story and its acceptance criteria — change per task
5. Progress file, recent errors, the ask — change every turn

Why: providers cache the longest identical prefix of a request.
Anything that changes near the top (a date, a random ID, a reordered list)
breaks the cache for everything after it, so it costs more and runs slower.
