export const BED_STATUS = [
  "FREE",
  "OCCUPIED",
  "RESERVED",
  "CLEANING",
  "MAINTENANCE",
  "BLOCKED",
] as const;

export type BedStatus = (typeof BED_STATUS)[number];
