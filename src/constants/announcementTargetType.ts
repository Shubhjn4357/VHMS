export const ANNOUNCEMENT_TARGET_TYPE = [
  "ALL",
  "ROLE",
  "DEPARTMENT",
] as const;

export type AnnouncementTargetType = (typeof ANNOUNCEMENT_TARGET_TYPE)[number];
