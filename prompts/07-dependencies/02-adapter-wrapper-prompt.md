# External Service Adapter Wrapper Prompt

**External Dependencies** · "Vetting, Adapters, and Offline Contracts" · Adapter Pattern

```text
Create an isolated adapter for [External Service] under `src/adapters/`.
Rules:
- Wrap all external network calls; never let third-party types leak into domain code.
- Accept an injected HTTP client and configuration.
- Implement retry policies with idempotency keys for transient 429/5xx failures.
- Reject malformed parameters before sending any network request.
```
