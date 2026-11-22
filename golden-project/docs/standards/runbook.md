# Runbook — Mawid in production

## Deploy

Merge to main → the deploy workflow runs the gates, deploys to staging, runs the smoke test, then waits for a person to approve production.

## Roll back (first, before you debug)

1. In GitHub Actions, re-run the production job of the last good commit, or: `./deploy.sh production <last good sha>`.
2. If a database migration ran: migrations are expand-then-contract, so the previous version still works with the new schema. Never run a down-migration in a hurry.
3. If the problem is a new feature: turn its flag off (config `flags.json`), no deploy needed.

## Incident: bookings fail

1. Check: `event="booking.failed"` in the logs in the last 15 minutes, grouped by `error`.
2. SlotTaken spikes → normal at peak. Unavailable/Timeout from SMS → the booking still stands (AC 2.3); check the provider status page.
3. Errors from the database → check connections and disk; roll back if it started with a deploy.
4. Write down the timeline as you go. After: a blameless post-incident note in docs/incidents/, and one test or alert that would have caught it.

## Who

On call this week: <name, phone>. Clinic owner (business decisions): <name, phone>.
