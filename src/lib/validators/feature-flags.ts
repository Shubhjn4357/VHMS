import { z } from "zod";

import { FEATURE_FLAGS } from "@/constants/featureFlags";
import { APP_ROLES } from "@/constants/roles";

export const updateFeatureFlagSchema = z.object({
  key: z.enum(FEATURE_FLAGS),
  enabled: z.boolean(),
  rolloutPercentage: z.number().int().min(0).max(100),
  targetRoles: z.array(z.enum(APP_ROLES)),
});
