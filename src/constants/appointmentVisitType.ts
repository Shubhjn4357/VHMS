export const APPOINTMENT_VISIT_TYPES = ["SCHEDULED", "WALK_IN"] as const;

export type AppointmentVisitType = (typeof APPOINTMENT_VISIT_TYPES)[number];
