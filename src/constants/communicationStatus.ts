export const COMMUNICATION_STATUS = [
  "QUEUED",
  "SENT",
  "DELIVERED",
  "FAILED",
] as const;

export type CommunicationStatus = (typeof COMMUNICATION_STATUS)[number];
