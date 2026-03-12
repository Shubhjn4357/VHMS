export const APPOINTMENT_STATUS = [
  "SCHEDULED",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_CONSULTATION",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "RESCHEDULED",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[number];
