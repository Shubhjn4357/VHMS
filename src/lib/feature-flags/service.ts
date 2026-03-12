import { asc, eq } from "drizzle-orm";

import {
  FEATURE_FLAG_DEFAULTS,
  FEATURE_FLAGS,
  type FeatureFlagKey,
} from "@/constants/featureFlags";
import { APP_ROLES, type AppRole } from "@/constants/roles";
import { getDb } from "@/db/client";
import { featureFlags, users } from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/log";
import { ApiError } from "@/lib/api/errors";
import type {
  FeatureFlagRecord,
  FeatureFlagsWorkspaceResponse,
  FeatureFlagUpdateInput,
} from "@/types/featureFlags";

export function flagToEnvKey(key: FeatureFlagKey) {
  return `FEATURE_FLAG_${
    key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase()
  }`;
}

export function parseEnvBoolean(value?: string) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return null;
}

export function resolveEnvOverride(
  key: FeatureFlagKey,
  source: NodeJS.ProcessEnv = process.env,
) {
  return parseEnvBoolean(source[flagToEnvKey(key)]);
}

export function clampRolloutPercentage(value: number) {
  if (!Number.isFinite(value)) {
    return 100;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

export function parseTargetRoles(value?: string | null): AppRole[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((role): role is AppRole =>
      APP_ROLES.includes(role as AppRole)
    );
  } catch {
    return [];
  }
}

function toStableBucket(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash % 100;
}

export function resolveFeatureFlagForSubject(
  flag: Pick<
    FeatureFlagRecord,
    "key" | "envEnabled" | "dbEnabled" | "rolloutPercentage" | "targetRoles"
  >,
  subject?: {
    role?: AppRole | null;
    stableId?: string | null;
  },
) {
  if (flag.envEnabled !== null) {
    return flag.envEnabled;
  }

  if (!flag.dbEnabled) {
    return false;
  }

  if (flag.targetRoles.length > 0) {
    if (!subject?.role || !flag.targetRoles.includes(subject.role)) {
      return false;
    }
  }

  const rolloutPercentage = clampRolloutPercentage(flag.rolloutPercentage);
  if (rolloutPercentage >= 100) {
    return true;
  }

  if (rolloutPercentage <= 0 || !subject?.stableId) {
    return false;
  }

  return toStableBucket(`${flag.key}:${subject.stableId}`) < rolloutPercentage;
}

function toFlagRecord(row: {
  key: FeatureFlagKey;
  enabled: boolean;
  rolloutPercentage: number;
  targetRoles: string;
  description: string;
  updatedAt: Date;
  updatedByUserId: string | null;
  updatedByName: string | null;
}): FeatureFlagRecord {
  const envEnabled = resolveEnvOverride(row.key);
  const targetRoles = parseTargetRoles(row.targetRoles);
  const rolloutPercentage = clampRolloutPercentage(row.rolloutPercentage);

  return {
    key: row.key,
    description: row.description,
    defaultEnabled: FEATURE_FLAG_DEFAULTS[row.key],
    envEnabled,
    dbEnabled: row.enabled,
    resolvedEnabled: envEnabled ?? row.enabled,
    lockedByEnv: envEnabled !== null,
    rolloutPercentage,
    targetRoles,
    roleTargeted: targetRoles.length > 0,
    rolloutActive: rolloutPercentage < 100,
    updatedAt: row.updatedAt.toISOString(),
    updatedByUserId: row.updatedByUserId,
    updatedByName: row.updatedByName,
  };
}

export async function listFeatureFlagsWorkspace(): Promise<
  FeatureFlagsWorkspaceResponse
> {
  const db = getDb();
  const rows = await db
    .select({
      key: featureFlags.key,
      enabled: featureFlags.enabled,
      rolloutPercentage: featureFlags.rolloutPercentage,
      targetRoles: featureFlags.targetRoles,
      description: featureFlags.description,
      updatedAt: featureFlags.updatedAt,
      updatedByUserId: featureFlags.updatedByUserId,
      updatedByName: users.name,
    })
    .from(featureFlags)
    .leftJoin(users, eq(featureFlags.updatedByUserId, users.id))
    .orderBy(asc(featureFlags.key));

  const rowMap = new Map(rows.map((row) => [row.key, row]));
  const flags = FEATURE_FLAGS.map((key) => {
    const row = rowMap.get(key);

    return toFlagRecord({
      key,
      enabled: row?.enabled ?? FEATURE_FLAG_DEFAULTS[key],
      rolloutPercentage: row?.rolloutPercentage ?? 100,
      targetRoles: row?.targetRoles ?? "[]",
      description: row?.description ?? `${key} feature flag`,
      updatedAt: row?.updatedAt ?? new Date(0),
      updatedByUserId: row?.updatedByUserId ?? null,
      updatedByName: row?.updatedByName ?? null,
    });
  });

  return {
    flags,
    summary: {
      total: flags.length,
      enabled: flags.filter((flag) => flag.resolvedEnabled).length,
      envOverrides: flags.filter((flag) => flag.lockedByEnv).length,
      customized:
        flags.filter((flag) => flag.dbEnabled !== flag.defaultEnabled).length,
      partialRollouts: flags.filter((flag) => flag.rolloutActive).length,
      roleTargeted: flags.filter((flag) => flag.roleTargeted).length,
    },
  };
}

export async function updateFeatureFlag(
  input: FeatureFlagUpdateInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const existing = await db.query.featureFlags.findFirst({
    where: eq(featureFlags.key, input.key),
  });

  if (!existing) {
    throw new ApiError(404, "Feature flag not found.");
  }

  await db
    .update(featureFlags)
    .set({
      enabled: input.enabled,
      rolloutPercentage: clampRolloutPercentage(input.rolloutPercentage),
      targetRoles: JSON.stringify(
        input.targetRoles.filter((role): role is AppRole =>
          APP_ROLES.includes(role)
        ),
      ),
      updatedByUserId: actorUserId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(featureFlags.key, input.key));

  await recordAuditLog({
    actorUserId,
    action: "featureFlags.updated",
    entityType: "feature_flag",
    entityId: input.key,
    metadata: {
      key: input.key,
      enabled: input.enabled,
      rolloutPercentage: clampRolloutPercentage(input.rolloutPercentage),
      targetRoles: input.targetRoles,
      envOverride: resolveEnvOverride(input.key),
    },
  });

  const workspace = await listFeatureFlagsWorkspace();
  const record = workspace.flags.find((flag) => flag.key === input.key);

  if (!record) {
    throw new ApiError(500, "Unable to load the updated feature flag.");
  }

  return record;
}
