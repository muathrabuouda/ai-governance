// Written after `npm run mutate` showed three survivors. Each test pins one boundary or rule.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cancelAppointment } from "../../src/modules/booking/cancel.ts";
import { canTransition, type AppointmentStatus } from "../../src/modules/booking/domain.ts";
import { bookSlot } from "../../src/modules/booking/book.ts";
import { memoryRepo, fixedClock, appt } from "./memory.ts";

test("exactly 24 hours before → Cancelled, not late (spec: late is LESS than 24h)", async () => {
  const { repo } = memoryRepo([appt({ startsAt: new Date("2026-11-17T08:00:00Z") })]);
  const r = await cancelAppointment("a1", "p1", { repo, clock: fixedClock("2026-11-16T08:00:00Z") });
  assert.deepEqual(r, { ok: true, status: "Cancelled" });
});

test("every transition not drawn in the state diagram is refused", () => {
  const all: AppointmentStatus[] = [
    "Requested",
    "Confirmed",
    "Cancelled",
    "LateCancelled",
    "Completed",
    "NoShow",
  ];
  const drawn = new Set([
    "Requested>Confirmed",
    "Requested>Cancelled",
    "Confirmed>Cancelled",
    "Confirmed>LateCancelled",
    "Confirmed>Completed",
    "Confirmed>NoShow",
  ]);
  for (const from of all)
    for (const to of all)
      assert.equal(canTransition(from, to), drawn.has(`${from}>${to}`), `${from} → ${to}`);
});

test("a slot starting exactly now → InPast", async () => {
  const repo = {
    reserve: async () => "reserved" as const,
    slotStart: async () => new Date("2026-11-16T08:00:00Z"),
    findByKey: async () => undefined,
    saveKey: async () => {},
  };
  const notifier = { send: async () => ({ ok: true as const, providerId: "x" }) };
  const r = await bookSlot(
    { slotId: "s", patientId: "p", phone: "+970599123456", idempotencyKey: "k" },
    { repo, clock: fixedClock("2026-11-16T08:00:00Z"), newId: () => "a", notifier, t: (k: string) => k },
  );
  assert.deepEqual(r, { ok: false, error: "InPast" });
});
