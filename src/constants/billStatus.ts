export const BILL_STATUS = [
  "DRAFT",
  "PENDING",
  "PARTIALLY_PAID",
  "PAID",
  "CANCELLED",
  "REFUNDED",
] as const;

export type BillStatus = (typeof BILL_STATUS)[number];
