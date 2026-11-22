// LEGACY entry point, kept so existing callers keep working (strangler step 2 of 3).
// The logic moved to src/modules/reports/daily.ts. Step 3: move callers, then delete this file.
import { summariseDay, renderDay, type ReportRow } from "../modules/reports/daily.ts";

export function dailyReport(rows: ReportRow[], day: string): string {
  return renderDay(day, summariseDay(rows, day));
}
