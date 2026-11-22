import { test } from "node:test";
import assert from "node:assert/strict";
import { cancelAppointment } from "../../src/modules/booking/cancel.ts";
import { memoryRepo, fixedClock, appt } from "./memory.ts";

test("ac_4_1: cancel 3 days before -> Cancelled, slot free again", async () => {
  const { repo, isSlotFree } = memoryRepo([appt({ startsAt: new Date("2026-11-13T08:00:00Z") })]);
  const res = await cancelAppointment("a1", "p1", { repo, clock: fixedClock("2026-11-10T08:00:00Z") });
  assert.deepEqual(res, { ok: true, status: "Cancelled" });
  assert.equal(isSlotFree("s1"), true);
});

test("ac_4_2: cancel 20 hours before -> LateCancelled, slot free again", async () => {
  const { repo, isSlotFree } = memoryRepo([appt({ startsAt: new Date("2026-11-11T04:00:00Z") })]);
  const res = await cancelAppointment("a1", "p1", { repo, clock: fixedClock("2026-11-10T08:00:00Z") });
  assert.deepEqual(res, { ok: true, status: "LateCancelled" });
  assert.equal(isSlotFree("s1"), true);
});

test("another patient cannot cancel", async () => {
  const { repo } = memoryRepo([appt()]);
  const res = await cancelAppointment("a1", "p2", { repo, clock: fixedClock("2026-11-10T08:00:00Z") });
  assert.deepEqual(res, { ok: false, error: "NotOwner" });
});

test("a completed appointment cannot be cancelled (no arrow in the state diagram)", async () => {
  const { repo, isSlotFree } = memoryRepo([appt({ status: "Completed" })]);
  const res = await cancelAppointment("a1", "p1", { repo, clock: fixedClock("2026-11-10T08:00:00Z") });
  assert.deepEqual(res, { ok: false, error: "NotCancellable" });
  assert.equal(isSlotFree("s1"), false);
});

test("unknown id -> NotFound", async () => {
  const { repo } = memoryRepo([]);
  const res = await cancelAppointment("x", "p1", { repo, clock: fixedClock("2026-11-10T08:00:00Z") });
  assert.deepEqual(res, { ok: false, error: "NotFound" });
});
