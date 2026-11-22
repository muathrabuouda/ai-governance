// Story 1: available slots for the next days. Two versions, to show the N+1 query problem.
export interface Slot {
  id: string;
  doctorId: string;
  startsAt: Date;
}

export interface SlotRepository {
  slotsFor(doctorId: string, from: Date, to: Date): Promise<Slot[]>; // one query
  isTaken(slotId: string): Promise<boolean>; // one query PER SLOT
  slotsForDoctors(doctorIds: string[], from: Date, to: Date): Promise<Slot[]>; // one query for all doctors
  takenAmong(slotIds: string[]): Promise<Set<string>>; // one query for all slots
}

const FRIDAY = 5;
const isClinicDay = (d: Date) => d.getUTCDay() !== FRIDAY; // AC 1.2 (simplified: clinic closed on Friday)

// N+1: one query per doctor, then one query per slot. Fine with 8 slots, slow with 800.
export async function availableSlotsNaive(
  repo: SlotRepository,
  doctorIds: string[],
  from: Date,
  to: Date,
): Promise<Slot[]> {
  const out: Slot[] = [];
  for (const id of doctorIds) {
    for (const s of await repo.slotsFor(id, from, to)) {
      if (isClinicDay(s.startsAt) && !(await repo.isTaken(s.id))) out.push(s);
    }
  }
  return out.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

// Batched: two queries, whatever the number of doctors and slots. Same result.
export async function availableSlots(
  repo: SlotRepository,
  doctorIds: string[],
  from: Date,
  to: Date,
): Promise<Slot[]> {
  const slots = (await repo.slotsForDoctors(doctorIds, from, to)).filter((s) => isClinicDay(s.startsAt));
  const taken = await repo.takenAmong(slots.map((s) => s.id));
  return slots.filter((s) => !taken.has(s.id)).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}
