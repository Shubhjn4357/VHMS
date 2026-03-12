export const CONSENT_STATUS = [
  "draft",
  "pending_signature",
  "signed",
  "declined",
  "expired",
  "revoked",
] as const;

export type ConsentStatus = (typeof CONSENT_STATUS)[number];
