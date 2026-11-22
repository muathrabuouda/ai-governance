import type { Appointment } from "./domain.ts";

export interface AppointmentRepository {
  get(id: string): Promise<Appointment | undefined>;
  save(a: Appointment): Promise<void>;
  releaseSlot(slotId: string): Promise<void>;
}

export interface Clock {
  now(): Date;
}
