export const CHARGE_CATEGORIES = [
  "CONSULTATION",
  "ROOM",
  "BED",
  "NURSING",
  "LAB",
  "PHARMACY",
  "PROCEDURE",
  "SERVICE",
  "PACKAGE",
] as const;

export type ChargeCategoryKey = (typeof CHARGE_CATEGORIES)[number];
