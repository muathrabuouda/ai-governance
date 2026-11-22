// Domain model for the booking module. Names follow docs/03-domain.md.
export type AppointmentStatus =
  | "Requested"
  | "Confirmed"
  | "Cancelled"
  | "LateCancelled"
  | "Completed"
  | "NoShow";

export interface Appointment {
  id: string;
  patientId: string;
  slotId: string;
  startsAt: Date; // stored and compared in UTC
  status: AppointmentStatus;
}

// Allowed transitions = the arrows in the state diagram. Anything else is refused.
const ALLOWED: Record<AppointmentStatus, AppointmentStatus[]> = {
  Requested: ["Confirmed", "Cancelled"],
  Confirmed: ["Cancelled", "LateCancelled", "Completed", "NoShow"],
  Cancelled: [],
  LateCancelled: [],
  Completed: [],
  NoShow: [],
};

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return ALLOWED[from].includes(to);
}

export const LATE_CANCEL_HOURS = 24; // business rule from the spec, section 6
