import { test } from "node:test";
import assert from "node:assert/strict";
import { pluralCategory, formatSlot } from "../../src/shared/i18n/format.ts";
import { normalizeArabic } from "../../src/shared/i18n/normalize.ts";

test("Arabic has six plural categories", () => {
  const got = [0, 1, 2, 3, 11, 100].map((n) => pluralCategory(n, "ar"));
  assert.deepEqual(got, ["zero", "one", "two", "few", "many", "other"]);
});

test("search finds أحمد when the user types احمد", () => {
  assert.equal(normalizeArabic("أَحْمَد"), normalizeArabic("احمد"));
  assert.equal(normalizeArabic("مُصطفـــى"), normalizeArabic("مصطفي"));
});

test("slot time is shown in clinic time, not server time", () => {
  const s = formatSlot(new Date("2026-11-10T08:00:00Z"), "en"); // 10:00 in Asia/Jerusalem (UTC+2)
  assert.match(s, /10:00/);
});

test("Arabic output uses Arabic-Indic digits when asked", () => {
  assert.match(formatSlot(new Date("2026-11-10T08:00:00Z"), "ar-PS"), /[٠-٩]/);
});

test("the region decides month names: ar-PS says تشرين الثاني", () => {
  assert.match(formatSlot(new Date("2026-11-10T08:00:00Z"), "ar-PS"), /تشرين الثاني/);
});
