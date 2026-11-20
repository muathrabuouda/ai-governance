# ADR-0001: Start as a modular monolith

Status: Accepted · 2026-11-09 · Owner: Muath

## Context

Team of 2. ~300 bookings/day expected. NFR-02 needs 99.5% uptime.
One VPS budget. No ops engineer.

## Options considered

1. Microservices (booking, notify, users)
2. Modular monolith: modules booking / scheduling / notify
3. Serverless functions

## Decision

Option 2. One deployable, one PostgreSQL database.
Modules talk only through their public service interfaces.

## Consequences

- One deploy, one log stream, simple local setup
- Module boundaries allow extracting notify later

* Discipline needed: an architecture test fails on cross-module imports
* Scaling is vertical until proven otherwise
