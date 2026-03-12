export const NOTIFICATION_PRIORITY = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
] as const;

export type NotificationPriority = (typeof NOTIFICATION_PRIORITY)[number];
