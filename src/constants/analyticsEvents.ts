export const ANALYTICS_EVENTS = [
  "auth.login.success",
  "auth.login.failure",
  "billing.created",
  "billing.finalized",
  "appointments.created",
  "occupancy.bed.assigned",
  "staffAccess.approved",
  "blog.published",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];
