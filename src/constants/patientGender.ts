export const PATIENT_GENDERS = [
  "MALE",
  "FEMALE",
  "OTHER",
  "UNKNOWN",
] as const;

export type PatientGender = (typeof PATIENT_GENDERS)[number];
