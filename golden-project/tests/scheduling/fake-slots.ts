import type { Slot, SlotRepository } from "../../src/modules/scheduling/available.ts";

// In-memory repository that COUNTS queries and can simulate database latency.
export function fakeSlots(slots: Slot[], taken: Set<string>, latencyMs = 0) {
  let queries = 0;
  const q = async <T>(v: T) => {
    queries++;
    if (latencyMs) await new Promise((r) => setTimeout(r, latencyMs));
    return v;
  };
  const inRange = (s: Slot, from: Date, to: Date) => s.startsAt >= from && s.startsAt < to;
  const repo: SlotRepository = {
    slotsFor: (id, from, to) => q(slots.filter((s) => s.doctorId === id && inRange(s, from, to))),
    isTaken: (id) => q(taken.has(id)),
    slotsForDoctors: (ids, from, to) =>
      q(slots.filter((s) => ids.includes(s.doctorId) && inRange(s, from, to))),
    takenAmong: (ids) => q(new Set(ids.filter((id) => taken.has(id)))),
  };
  return { repo, queries: () => queries };
}

export function makeSlots(
  doctors: number,
  perDay: number,
  days: number,
  start = "2026-11-23T06:00:00Z",
): Slot[] {
  const out: Slot[] = [];
  for (let d = 0; d < doctors; d++)
    for (let day = 0; day < days; day++)
      for (let k = 0; k < perDay; k++)
        out.push({
          id: `d${d}-${day}-${k}`,
          doctorId: `d${d}`,
          startsAt: new Date(Date.parse(start) + day * 86_400_000 + k * 1_200_000),
        });
  return out;
}
