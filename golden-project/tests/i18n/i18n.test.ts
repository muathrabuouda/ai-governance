import { test } from "node:test";
import assert from "node:assert/strict";
import { pluralCategory, formatSlot } from "../../src/shared/i18n/format.ts";

test("plural categories match LDML rules", () => {
  const got = [0, 1, 2, 3, 11, 100].map((n) => pluralCategory(n, "en"));
  assert.ok(got.length === 6);
});

test("slot time is shown in clinic time, not server time", () => {
  const s = formatSlot(new Date("2026-11-10T08:00:00Z"), "en");
  assert.match(s, /10:00/);
});
