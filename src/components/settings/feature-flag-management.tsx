"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Settings2 } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { APP_ROLES, ROLE_LABELS, type AppRole } from "@/constants/roles";
import { useFeatureFlags, useUpdateFeatureFlag } from "@/hooks/useFeatureFlags";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import type { FeatureFlagKey } from "@/constants/featureFlags";
import type { FeatureFlagRecord } from "@/types/featureFlags";

type FeatureFlagDraft = {
  enabled: boolean;
  rolloutPercentage: string;
  targetRoles: AppRole[];
};

function formatTimestamp(value: string) {
  return value === new Date(0).toISOString()
    ? "Seed default"
    : new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
}

type FeatureFlagManagementProps = {
  hideHeader?: boolean;
};

export function FeatureFlagManagement({ hideHeader = false }: FeatureFlagManagementProps) {
  const flagsQuery = useFeatureFlags();
  const updateFlagMutation = useUpdateFeatureFlag();
  const { canAccess: canManage } = useModuleAccess(["settings.manage"]);
  const [drafts, setDrafts] = useState<
    Partial<Record<FeatureFlagKey, FeatureFlagDraft>>
  >({});

  function getDraft(flag: FeatureFlagRecord): FeatureFlagDraft {
    return drafts[flag.key] ?? {
      enabled: flag.dbEnabled,
      rolloutPercentage: String(flag.rolloutPercentage),
      targetRoles: flag.targetRoles,
    };
  }

  function updateDraft(
    flag: FeatureFlagRecord,
    nextDraft: Partial<FeatureFlagDraft>,
  ) {
    setDrafts((current) => ({
      ...current,
      [flag.key]: {
        ...getDraft(flag),
        ...nextDraft,
      },
    }));
  }

  if (flagsQuery.isLoading) {
    return (
      <EmptyState
        className="min-h-[36rem]"
        icon={Loader2}
        title="Loading feature flags"
        description="Role and environment-aware feature configuration is being prepared."
      />
    );
  }

  if (flagsQuery.isError || !flagsQuery.data) {
    return (
      <EmptyState
        className="min-h-[36rem]"
        icon={AlertTriangle}
        title="Feature flag settings are unavailable"
        description={flagsQuery.error instanceof Error
          ? flagsQuery.error.message
          : "The feature flag service request failed."}
      />
    );
  }

  return (
    <div className="space-y-6">
      {hideHeader
        ? null
        : (
          <PageHeader
            eyebrow="Phase 9 controls"
            title="Settings and feature flags"
            description="Database-controlled flags are merged with environment overrides so staged rollout stays visible and auditable."
          />
        )}

      <section className="grid gap-4 xl:grid-cols-4">
        {[
          ["Total flags", flagsQuery.data.summary.total],
          ["Enabled", flagsQuery.data.summary.enabled],
          ["Env overrides", flagsQuery.data.summary.envOverrides],
          ["DB customizations", flagsQuery.data.summary.customized],
          ["Gradual rollout", flagsQuery.data.summary.partialRollouts],
          ["Role targeted", flagsQuery.data.summary.roleTargeted],
        ].map(([label, value]) => (
          <SurfaceCard key={String(label)}>
            <p className="text-sm text-ink-soft">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">
              {value}
            </p>
          </SurfaceCard>
        ))}
      </section>

      <div className="space-y-4">
        {flagsQuery.data.flags.map((flag) => {
          const draft = getDraft(flag);
          const isPending = updateFlagMutation.isPending &&
            updateFlagMutation.variables?.key === flag.key;

          return (
            <SurfaceCard key={flag.key}>
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge>
                      {flag.key}
                    </Badge>
                    {flag.lockedByEnv
                      ? (
                        <Badge variant="warning">
                          Locked by env
                        </Badge>
                      )
                      : null}
                    {flag.rolloutActive
                      ? <Badge variant="outline">{flag.rolloutPercentage}% rollout</Badge>
                      : null}
                    {flag.roleTargeted
                      ? <Badge variant="outline">Role targeted</Badge>
                      : null}
                  </div>
                  <p className="mt-3 text-lg font-semibold text-ink">
                    {flag.description}
                  </p>
                  <p className="mt-2 text-sm text-ink-soft">
                    Default {flag.defaultEnabled ? "enabled" : "disabled"} / DB
                    {" "}
                    {flag.dbEnabled ? "enabled" : "disabled"} / Resolved{" "}
                    {flag.resolvedEnabled ? "enabled" : "disabled"}
                  </p>
                  <p className="mt-2 text-sm text-ink-soft">
                    Rollout {flag.rolloutPercentage}% / Target roles{" "}
                    {flag.targetRoles.length > 0
                      ? flag.targetRoles.map((role) => ROLE_LABELS[role]).join(", ")
                      : "All roles"}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-ink-soft">
                    Updated {formatTimestamp(flag.updatedAt)}
                    {flag.updatedByName ? ` by ${flag.updatedByName}` : ""}
                  </p>
                </div>

                <div className="w-full max-w-xl space-y-4">
                  {flag.envEnabled !== null
                    ? (
                      <Badge variant="outline">
                        Env override {flag.envEnabled ? "on" : "off"}
                      </Badge>
                    )
                    : null}

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="glass-panel-muted rounded-[20px] p-4">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                        DB enabled
                      </span>
                      <div className="mt-3 flex items-center gap-3">
                        <Checkbox
                          checked={draft.enabled}
                          disabled={!canManage || flag.lockedByEnv}
                          onChange={(event) =>
                            updateDraft(flag, {
                              enabled: event.target.checked,
                            })}
                        />
                        <span className="text-sm text-ink">
                          Keep this module enabled at the DB layer
                        </span>
                      </div>
                    </label>

                    <label className="glass-panel-muted rounded-[20px] p-4">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                        Rollout percentage
                      </span>
                      <Input
                        className="mt-3"
                        disabled={!canManage || flag.lockedByEnv}
                        max="100"
                        min="0"
                        onChange={(event) =>
                          updateDraft(flag, {
                            rolloutPercentage: event.target.value,
                          })}
                        type="number"
                        value={draft.rolloutPercentage}
                      />
                    </label>
                  </div>

                  <div className="glass-panel-muted rounded-[20px] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                      Role targeting
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {APP_ROLES.map((role) => {
                        const checked = draft.targetRoles.includes(role);

                        return (
                          <label
                            className="glass-chip flex items-center gap-3 rounded-[18px] px-3 py-2"
                            key={role}
                          >
                            <Checkbox
                              checked={checked}
                              disabled={!canManage || flag.lockedByEnv}
                              onChange={(event) =>
                                updateDraft(flag, {
                                  targetRoles: event.target.checked
                                    ? [...draft.targetRoles, role]
                                    : draft.targetRoles.filter((item) => item !== role),
                                })}
                            />
                            <span className="text-sm text-ink">
                              {ROLE_LABELS[role]}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="mt-3 text-sm text-ink-soft">
                      Leave all roles unchecked to allow the flag for every role.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      disabled={!canManage || flag.lockedByEnv || isPending}
                      onClick={() =>
                        updateFlagMutation.mutate({
                          key: flag.key,
                          enabled: draft.enabled,
                          rolloutPercentage: Number(
                            draft.rolloutPercentage || "0",
                          ),
                          targetRoles: draft.targetRoles,
                        })}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {isPending
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Settings2 className="h-4 w-4" />}
                      Save DB rollout
                    </Button>
                    <Button
                      disabled={!canManage || flag.lockedByEnv || isPending}
                      onClick={() =>
                        updateDraft(flag, {
                          enabled: flag.defaultEnabled,
                          rolloutPercentage: "100",
                          targetRoles: [],
                        })}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      Reset draft
                    </Button>
                  </div>
                </div>
              </div>
            </SurfaceCard>
          );
        })}
      </div>
    </div>
  );
}
