# Progress — camp wrap-up

Updated: 2026-11-30

## Done in session 7

- Legacy daily report refactored behind characterization tests (strangler steps 0–2)
- Story 1 batched: 2 queries instead of one per slot (bench: 2900 → 2 queries for 20 doctors)
- Secret scan gate, threat model for story 2, structured logger with redaction, feature flags
- Deploy workflow with staging, smoke test, approval and rollback; agent review on every PR

## Next (after the camp)

- Strangler step 3: move callers to src/modules/reports and delete src/legacy
- Answers from the clinic owner on the two report questions (docs/refactor-plan.md)
- Rate limit and max 3 active bookings per patient (threat model, open)
