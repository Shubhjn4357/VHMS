export const CONSENT_SIGNER_ROLES = ["PATIENT", "WITNESS", "DOCTOR"] as const;

export type ConsentSignerRole = (typeof CONSENT_SIGNER_ROLES)[number];
