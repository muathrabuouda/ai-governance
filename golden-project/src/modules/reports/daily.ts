// Refactored daily report. Same output as the legacy version (proved by tests/legacy/),
// now with names from the glossary, types, and the counting separated from the printing.
import type { AppointmentStatus } from "../booking/domain.ts";

export interface ReportRow {
  date: string;
  patient: string;
  status: AppointmentStatus;
} // date: ISO string in UTC

export interface DaySummary {
  booked: number;
  waiting: number;
  cancelled: number;
  noShow: number;
  list: string[];
}

const BOOKED: AppointmentStatus[] = ["Confirmed", "Requested"];
const CANCELLED: AppointmentStatus[] = ["Cancelled", "LateCancelled"];

export function summariseDay(rows: ReportRow[], day: string): DaySummary {
  const today = rows.filter((r) => r.date.slice(0, 10) === day);
  const count = (statuses: AppointmentStatus[]) => today.filter((r) => statuses.includes(r.status)).length;
  return {
    booked: count(BOOKED),
    waiting: count(["Requested"]),
    cancelled: count(CANCELLED),
    noShow: count(["NoShow"]),
    list: today
      .filter((r) => BOOKED.includes(r.status))
      .map((r) => `${r.date.slice(11, 16)} ${r.patient}`)
      .sort(),
  };
}

export function renderDay(day: string, s: DaySummary): string {
  const lines = [
    `Day ${day}`,
    `Booked: ${s.booked} (waiting confirmation: ${s.waiting})`,
    `Cancelled: ${s.cancelled}`,
  ];
  if (s.noShow > 0) lines.push(`No-show: ${s.noShow}`);
  return [...lines, ...s.list].join("\n") + "\n";
}
