// Property-based tests without a library: a seeded generator, many random cases, one rule each.
// When a case fails, the message prints the seed and the input so you can replay it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cancelAppointment } from "../src/modules/booking/cancel.ts";
import { LATE_CANCEL_HOURS } from "../src/modules/booking/domain.ts";
import { memoryRepo, fixedClock, appt } from "./booking/memory.ts";

const SEED = Number(process.env.SEED ?? 20261116);
function rng(seed: number) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}

test("cancel: LateCancelled exactly when fewer than 24 hours remain (any time, any appointment)", async () => {
  const r = rng(SEED);
  const now = "2026-11-16T08:00:00Z";
  for (let i = 0; i < 300; i++) {
    const hoursLeft = 1 + r() * 96; // 1 to 97 hours ahead
    const startsAt = new Date(Date.parse(now) + hoursLeft * 3_600_000);
    const { repo } = memoryRepo([appt({ startsAt })]);
    const res = await cancelAppointment("a1", "p1", { repo, clock: fixedClock(now) });
    const expected = hoursLeft < LATE_CANCEL_HOURS ? "LateCancelled" : "Cancelled";
    assert.deepEqual(res, { ok: true, status: expected }, `seed ${SEED}, hoursLeft ${hoursLeft.toFixed(3)}`);
  }
});
