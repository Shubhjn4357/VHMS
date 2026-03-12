import type { FeatureFlagKey } from "@/constants/featureFlags";
import type { AppRole } from "@/constants/roles";

export type FeatureFlagRecord = {
  key: FeatureFlagKey;
  description: string;
  defaultEnabled: boolean;
  envEnabled: boolean | null;
  dbEnabled: boolean;
  resolvedEnabled: boolean;
  lockedByEnv: boolean;
  rolloutPercentage: number;
  targetRoles: AppRole[];
  roleTargeted: boolean;
  rolloutActive: boolean;
  updatedAt: string;
  updatedByUserId: string | null;
  updatedByName: string | null;
};

export type FeatureFlagsWorkspaceResponse = {
  flags: FeatureFlagRecord[];
  summary: {
    total: number;
    enabled: number;
    envOverrides: number;
    customized: number;
    partialRollouts: number;
    roleTargeted: number;
  };
};

export type FeatureFlagUpdateInput = {
  key: FeatureFlagKey;
  enabled: boolean;
  rolloutPercentage: number;
  targetRoles: AppRole[];
};
