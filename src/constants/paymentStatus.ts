export const PAYMENT_STATUS = [
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
  "REFUNDED",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[number];
