export const BLOG_STATUS = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export type BlogStatus = (typeof BLOG_STATUS)[number];
