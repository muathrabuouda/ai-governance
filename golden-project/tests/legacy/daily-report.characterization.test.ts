// Characterization tests: they record what the legacy code DOES today, right or wrong,
// so a refactoring can prove it changed nothing. Written BEFORE touching the code.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyReport } from "../../src/legacy/daily-report.ts";
import type { ReportRow } from "../../src/modules/reports/daily.ts";

const rows: ReportRow[] = [
  { date: "2026-11-23T09:30:00Z", patient: "Sarah", status: "Confirmed" },
  { date: "2026-11-23T08:00:00Z", patient: "Adam", status: "Requested" },
  { date: "2026-11-23T10:00:00Z", patient: "Layla", status: "LateCancelled" },
  { date: "2026-11-23T11:00:00Z", patient: "Khaled", status: "NoShow" },
  { date: "2026-11-23T12:00:00Z", patient: "Mona", status: "Completed" },
  { date: "2026-11-24T08:00:00Z", patient: "Yosef", status: "Confirmed" },
];

test("a normal day: counts, sorted list by time", () => {
  assert.equal(
    dailyReport(rows, "2026-11-23"),
    "Day 2026-11-23\nBooked: 2 (waiting confirmation: 1)\nCancelled: 1\nNo-show: 1\n08:00 Adam\n09:30 Sarah\n",
  );
});

test("no no-shows -> the No-show line is omitted", () => {
  assert.equal(
    dailyReport(
      rows.filter((r) => r.status !== "NoShow"),
      "2026-11-23",
    ),
    "Day 2026-11-23\nBooked: 2 (waiting confirmation: 1)\nCancelled: 1\n08:00 Adam\n09:30 Sarah\n",
  );
});

test("an empty day", () => {
  assert.equal(
    dailyReport(rows, "2026-11-25"),
    "Day 2026-11-25\nBooked: 0 (waiting confirmation: 0)\nCancelled: 0\n",
  );
});

test("CURRENT BEHAVIOUR (suspicious): times are UTC, not clinic time; Completed is not counted anywhere", () => {
  // Recorded as-is. Whether this is a bug is a question for the clinic owner (docs/refactor-plan.md), not for the refactoring.
  assert.match(dailyReport(rows, "2026-11-23"), /^08:00 Adam$/m);
  assert.doesNotMatch(dailyReport(rows, "2026-11-23"), /Mona/);
});
