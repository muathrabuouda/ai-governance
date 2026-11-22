# Offline Consumer-Driven Contract Test Prompt

**External Dependencies** · "Vetting, Adapters, and Offline Contracts" · Contract Testing

```text
Write an automated contract test for the adapter against `contracts/<provider>.json`.
Rules:
- Zero network access: use a fake provider that validates outgoing requests against the schema and replays contract responses.
- Test all documented responses: 200/202 success, 400 rejection (no retry), 429 rate limit (retry with same idempotency key), 503 unavailable (bounded retry).
```
