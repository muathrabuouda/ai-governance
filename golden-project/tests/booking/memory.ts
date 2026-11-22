import type { Appointment } from "../../src/modules/booking/domain.ts";
import type { AppointmentRepository, Clock } from "../../src/modules/booking/ports.ts";

export function memoryRepo(seed: Appointment[]) {
  const rows = new Map(seed.map((a) => [a.id, a]));
  const freeSlots = new Set<string>();
  const repo: AppointmentRepository = {
    async get(id) {
      return rows.get(id);
    },
    async save(a) {
      rows.set(a.id, a);
    },
    async releaseSlot(slotId) {
      freeSlots.add(slotId);
    },
  };
  return { repo, isSlotFree: (slotId: string) => freeSlots.has(slotId) };
}

export const fixedClock = (iso: string): Clock => ({ now: () => new Date(iso) });

export const appt = (over: Partial<Appointment> = {}): Appointment => ({
  id: "a1",
  patientId: "p1",
  slotId: "s1",
  status: "Confirmed",
  startsAt: new Date("2026-11-13T08:00:00Z"),
  ...over,
});
