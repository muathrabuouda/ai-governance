import type { Appointment } from "./domain.ts";
import type { Clock } from "./ports.ts";
import type { Notifier } from "./notify.ts";

// Story 2: book a slot. Every outcome is a value.
export type BookResult =
  | { ok: true; appointmentId: string; replayed: boolean }
  | { ok: false; error: "SlotTaken" | "SlotNotFound" | "InPast" };

export interface BookingRepository {
  // Atomic check-and-set. In Postgres: a UNIQUE constraint on appointments(slot_id) for active rows.
  reserve(slotId: string, appt: Appointment): Promise<"reserved" | "taken" | "missing">;
  slotStart(slotId: string): Promise<Date | undefined>;
  // Idempotency: the same request key always returns the same appointment.
  findByKey(key: string): Promise<string | undefined>;
  saveKey(key: string, appointmentId: string): Promise<void>;
}

export async function bookSlot(
  req: { slotId: string; patientId: string; phone: string; idempotencyKey: string },
  deps: {
    repo: BookingRepository;
    clock: Clock;
    newId: () => string;
    notifier: Notifier;
    t: (key: string) => string;
  },
): Promise<BookResult> {
  const previous = await deps.repo.findByKey(req.idempotencyKey);
  if (previous) return { ok: true, appointmentId: previous, replayed: true }; // a retry, not a second booking

  const startsAt = await deps.repo.slotStart(req.slotId);
  if (!startsAt) return { ok: false, error: "SlotNotFound" };
  if (startsAt <= deps.clock.now()) return { ok: false, error: "InPast" };

  const appt: Appointment = {
    id: deps.newId(),
    patientId: req.patientId,
    slotId: req.slotId,
    startsAt,
    status: "Requested",
  };
  const outcome = await deps.repo.reserve(req.slotId, appt);
  if (outcome === "taken") return { ok: false, error: "SlotTaken" }; // AC 2.2
  if (outcome === "missing") return { ok: false, error: "SlotNotFound" };
  await deps.repo.saveKey(req.idempotencyKey, appt.id);

  // AC 2.3: the booking stands even if the message fails; the adapter retries, and the outbox retries later.
  await deps.notifier.send(req.phone, deps.t("booking.book.requested"), `${appt.id}:requested`);
  return { ok: true, appointmentId: appt.id, replayed: false };
}
