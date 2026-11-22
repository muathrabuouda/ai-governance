import { test } from "node:test";
import assert from "node:assert/strict";
import { logger } from "../../src/shared/log.ts";
import { flags } from "../../src/shared/flags.ts";

test("log: one JSON line per event, phone numbers redacted", () => {
  const lines: string[] = [];
  const log = logger(
    (l) => lines.push(l),
    () => new Date("2026-11-30T08:00:00Z"),
  );
  log.info("booking.created", {
    appointmentId: "a7",
    phone: "+970599123456",
    note: "call +970 599 123 456 back",
  });
  const e = JSON.parse(lines[0]);
  assert.equal(e.event, "booking.created");
  assert.equal(e.phone, "[redacted]");
  assert.doesNotMatch(lines[0], /599123456|599 123 456/);
});

test("flags: unknown or disabled flags are off", () => {
  const f = flags({ reminders: { enabled: false } });
  assert.equal(f.isOn("reminders", "p1"), false);
  assert.equal(f.isOn("nope", "p1"), false);
});

test("flags: percentage rollout is stable per user and close to the percentage", () => {
  const f = flags({ reminders: { enabled: true, percent: 20 } });
  const users = Array.from({ length: 2000 }, (_, i) => `p${i}`);
  const on = users.filter((u) => f.isOn("reminders", u)).length;
  assert.ok(on > 300 && on < 500, `${on} of 2000 on`);
  assert.ok(users.every((u) => f.isOn("reminders", u) === f.isOn("reminders", u)));
});
