export const FEATURE_FLAGS = [
  "communications",
  "blogCms",
  "occupancyBoard",
  "offlineDrafts",
  "dashboardCustomization",
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[number];

export const FEATURE_FLAG_DEFAULTS: Record<FeatureFlagKey, boolean> = {
  communications: true,
  blogCms: true,
  occupancyBoard: true,
  offlineDrafts: true,
  dashboardCustomization: true,
};
