# Code Craftsmanship & Invariant Enforcement Standards

> **Governance Standards Document:** Engineering rules for error handling, architectural boundaries, repository isolation, and data privacy.

---

## 1. Errors as Values (Zero Unchecked Throws)

Expected domain failures must always be modeled as typed Discriminated Unions / Result Types (`Result<T, E>`), NEVER thrown as arbitrary exceptions:

```typescript
// Correct: Explicit typed Result envelope
export type BookResult =
  | { ok: true; appointmentId: string }
  | { ok: false; error: "SlotTaken"; nextFreeSlots: Slot[] }
  | { ok: false; error: "InPast" }
  | { ok: false; error: "Unavailable" };

export function bookSlot(deps: BookingDeps, parcel: BookParcel): Promise<BookResult> {
  // Returns value; never throws expected business failures
}
```

### Exception Rules

- **Throwing is for unrecoverable infrastructure bugs only:** Database connection drop, out-of-memory, corrupted disk.
- **Handling is mandatory at boundaries:** API routers, CLI controllers, and message consumers pattern-match on `result.error` and map to appropriate HTTP status codes (400, 404, 409).

---

## 2. Hexagonal Boundary Law (Ports & Adapters)

Domain logic must remain pure, deterministic, and isolated from external volatility:

```
[ HTTP Router / CLI ] ──> [ Domain Service / Feature ] ──> [ Port Interface ]
                                                                   │
                                                                   ▼
                                                          [ Adapter (DB / SMS / API) ]
```

1. **Pure Domain:** Domain entities, value objects, and business workflows must have zero imports from express, fastify, pg, redis, or external HTTP clients.
2. **Explicit Port Contracts:** Dependencies on external services (storage, clock, notifications, random IDs) are injected through explicit TypeScript interfaces (`Clock`, `Notifier`, `Repository`).
3. **Contract Tests:** Every adapter implementation must have an automated contract test verifying external protocol compliance without calling live networks in CI.

---

## 3. Database & Repository Isolation

1. **No Inline Queries in Domain:** Direct database queries (`SELECT`, `INSERT`, `UPDATE`), ORM calls, or raw SQL are strictly forbidden inside domain services.
2. **Parcel In, Entity Out:** Repository methods accept strongly typed Parcels (DTOs) and return immutable domain entities or collections.
3. **Atomic Transactions:** Multi-entity state transitions must execute within explicit database transactions governed by the repository or unit-of-work layer.

---

## 4. Privacy & PII Protection in Logs

1. **Redact Sensitive Identifiers:** Phone numbers, email addresses, medical notes, passwords, and tokens must NEVER appear in plaintext in log streams.
2. **Log IDs, Not People:** Use opaque unique IDs (`patientId`, `slotId`, `correlationId`) in log entries instead of personal names.
3. **Structured JSON Logs:** All production logs must emit structured JSON containing `timestamp`, `level`, `event`, and safe metadata fields.
