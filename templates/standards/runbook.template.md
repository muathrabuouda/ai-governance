# Runbook — {{PROJECT_TITLE}} in production

## Deploy

{{DEPLOY_PROCEDURE}}

## Roll back (first, before you debug)

1. In GitHub Actions (or deployment manager), re-run the production job of the last good commit, or: `./deploy.sh production <last good sha>`.
2. If a database migration ran: migrations are expand-then-contract, so the previous version still works with the new schema. Never run a down-migration in a hurry.
3. If the problem is a new feature: turn its flag off (config `flags.json`), no deploy needed.

## Incident: {{PRIMARY_INCIDENT_SCENARIO}}

1. Check: `event="{{FAILURE_EVENT_NAME}}"` in the logs in the last 15 minutes, grouped by `error`.
2. {{INCIDENT_TRIAGE_POINT_1}}
3. {{INCIDENT_TRIAGE_POINT_2}}
4. Write down the timeline as you go. After: a blameless post-incident note in docs/incidents/, and one test or alert that would have caught it.

## Who

On call this week: {{ON_CALL_CONTACT}}. Business owner (business decisions): {{BUSINESS_OWNER_CONTACT}}.
