export const CONSENT_SIGNATURE_MODES = [
  "drawn_signature",
  "typed_confirmation",
  "staff_assisted_capture",
] as const;

export type ConsentSignatureMode = (typeof CONSENT_SIGNATURE_MODES)[number];
