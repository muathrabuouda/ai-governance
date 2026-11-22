import { canTransition, LATE_CANCEL_HOURS, type AppointmentStatus } from "./domain.ts";
import type { AppointmentRepository, Clock } from "./ports.ts";

// Story 4: cancel an appointment. Contract first: every outcome is a value, nothing is thrown.
export type CancelResult =
  | { ok: true; status: "Cancelled" | "LateCancelled" }
  | { ok: false; error: "NotFound" | "NotOwner" | "NotCancellable" };

export async function cancelAppointment(
  id: string,
  patientId: string,
  deps: { repo: AppointmentRepository; clock: Clock },
): Promise<CancelResult> {
  const appt = await deps.repo.get(id);
  if (!appt) return { ok: false, error: "NotFound" };
  if (appt.patientId !== patientId) return { ok: false, error: "NotOwner" };

  const hoursLeft = (appt.startsAt.getTime() - deps.clock.now().getTime()) / 3_600_000;
  const target: AppointmentStatus =
    appt.status === "Confirmed" && hoursLeft < LATE_CANCEL_HOURS ? "LateCancelled" : "Cancelled";

  if (!canTransition(appt.status, target)) return { ok: false, error: "NotCancellable" };

  await deps.repo.save({ ...appt, status: target });
  await deps.repo.releaseSlot(appt.slotId); // AC 4.1 and 4.2: the slot is free again
  return { ok: true, status: target };
}
