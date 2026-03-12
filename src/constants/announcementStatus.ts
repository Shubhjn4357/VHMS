export const ANNOUNCEMENT_STATUS = ["DRAFT", "PUBLISHED", "EXPIRED"] as const;

export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUS)[number];
