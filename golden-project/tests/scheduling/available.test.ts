import { test } from "node:test";
import assert from "node:assert/strict";
import { availableSlots, availableSlotsNaive } from "../../src/modules/scheduling/available.ts";
import { fakeSlots, makeSlots } from "./fake-slots.ts";

const from = new Date("2026-11-23T00:00:00Z"),
  to = new Date("2026-11-30T00:00:00Z"); // Monday to Monday

test("ac_1_1: 8 slots tomorrow, 3 taken → 5 shown, in time order", async () => {
  const slots = makeSlots(1, 8, 1, "2026-11-24T06:00:00Z");
  const { repo } = fakeSlots(slots.reverse(), new Set(["d0-0-1", "d0-0-4", "d0-0-6"]));
  const r = await availableSlots(repo, ["d0"], from, to);
  assert.equal(r.length, 5);
  assert.deepEqual(
    r.map((s) => s.startsAt),
    [...r.map((s) => s.startsAt)].sort((a, b) => a.getTime() - b.getTime()),
  );
});

test("ac_1_2: no slot on Friday", async () => {
  const { repo } = fakeSlots(makeSlots(2, 8, 7), new Set());
  const r = await availableSlots(repo, ["d0", "d1"], from, to);
  assert.ok(r.length > 0);
  assert.ok(r.every((s) => s.startsAt.getUTCDay() !== 5));
});

test("performance contract: the batched version uses 2 queries whatever the data size, and returns the same slots", async () => {
  const slots = makeSlots(10, 24, 7);
  const taken = new Set(slots.filter((_, i) => i % 3 === 0).map((s) => s.id));
  const a = fakeSlots(slots, taken),
    b = fakeSlots(slots, taken);
  const naive = await availableSlotsNaive(
    a.repo,
    slots.map((s) => s.doctorId).filter((v, i, x) => x.indexOf(v) === i),
    from,
    to,
  );
  const fast = await availableSlots(
    b.repo,
    ["d0", "d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9"],
    from,
    to,
  );
  assert.deepEqual(
    fast.map((s) => s.id),
    naive.map((s) => s.id),
  );
  assert.equal(b.queries(), 2);
  assert.ok(a.queries() > 100, `naive used ${a.queries()} queries`);
});
