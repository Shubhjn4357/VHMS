export const COMMUNICATION_CHANNEL = [
  "SMS",
  "EMAIL",
  "WHATSAPP",
  "IN_APP_NOTIFICATION",
  "SYSTEM_ANNOUNCEMENT",
  "INTERNAL_ACTIVITY_FEED",
] as const;

export type CommunicationChannel = (typeof COMMUNICATION_CHANNEL)[number];
