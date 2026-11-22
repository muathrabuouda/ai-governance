import { test } from "node:test";
import assert from "node:assert/strict";
import { bookSlot, type BookingRepository } from "../../src/modules/booking/book.ts";
import type { Appointment } from "../../src/modules/booking/domain.ts";
import type { Notifier } from "../../src/modules/booking/notify.ts";
import { fixedClock } from "./memory.ts";

function bookingRepo(slots: Record<string, string>) {
  const taken = new Map<string, Appointment>();
  const keys = new Map<string, string>();
  const repo: BookingRepository = {
    async reserve(slotId, appt) {
      if (!(slotId in slots)) return "missing";
      await Promise.resolve(); // a gap where another request could run
      if (taken.has(slotId)) return "taken"; // check and set with no await between them = atomic here
      taken.set(slotId, appt);
      return "reserved";
    },
    async slotStart(slotId) {
      return slots[slotId] ? new Date(slots[slotId]) : undefined;
    },
    async findByKey(k) {
      return keys.get(k);
    },
    async saveKey(k, id) {
      keys.set(k, id);
    },
  };
  return { repo, taken };
}
const sent: string[] = [];
const notifier: Notifier = {
  async send(_to, _t, key) {
    sent.push(key);
    return { ok: true, providerId: "x" };
  },
};
const down: Notifier = {
  async send() {
    return { ok: false, error: "Unavailable" };
  },
};
let n = 0;
const deps = (repo: BookingRepository, nt = notifier) => ({
  repo,
  clock: fixedClock("2026-11-16T08:00:00Z"),
  newId: () => `a${++n}`,
  notifier: nt,
  t: (k: string) => k,
});
const req = (over = {}) => ({
  slotId: "s10",
  patientId: "p1",
  phone: "+970599123456",
  idempotencyKey: "k-1",
  ...over,
});

test("ac_2_1: a free slot → appointment Requested, message sent", async () => {
  const { repo, taken } = bookingRepo({ s10: "2026-11-17T08:00:00Z" });
  const r = await bookSlot(req(), deps(repo));
  assert.equal(r.ok, true);
  assert.equal(taken.get("s10")?.status, "Requested");
  assert.ok(sent.length > 0);
});

test("ac_2_2: two patients at the same moment → exactly one wins", async () => {
  const { repo } = bookingRepo({ s10: "2026-11-17T08:00:00Z" });
  const [a, b] = await Promise.all([
    bookSlot(req({ patientId: "p1", idempotencyKey: "k-a" }), deps(repo)),
    bookSlot(req({ patientId: "p2", idempotencyKey: "k-b" }), deps(repo)),
  ]);
  assert.deepEqual([a.ok, b.ok].sort(), [false, true]);
  assert.deepEqual(
    [a, b].find((r) => !r.ok),
    { ok: false, error: "SlotTaken" },
  );
});

test("the same request sent twice (double click, network retry) → one appointment", async () => {
  const { repo } = bookingRepo({ s10: "2026-11-17T08:00:00Z" });
  const first = await bookSlot(req({ idempotencyKey: "same" }), deps(repo));
  const again = await bookSlot(req({ idempotencyKey: "same" }), deps(repo));
  assert.ok(first.ok && again.ok);
  assert.equal(again.appointmentId, first.appointmentId);
  assert.equal(again.replayed, true);
});

test("ac_2_3: the message service is down → the booking still stands", async () => {
  const { repo } = bookingRepo({ s10: "2026-11-17T08:00:00Z" });
  assert.equal((await bookSlot(req({ idempotencyKey: "k-down" }), deps(repo, down))).ok, true);
});

test("a slot in the past → InPast", async () => {
  const { repo } = bookingRepo({ s1: "2026-11-15T08:00:00Z" });
  assert.deepEqual(await bookSlot(req({ slotId: "s1", idempotencyKey: "k-p" }), deps(repo)), {
    ok: false,
    error: "InPast",
  });
});
