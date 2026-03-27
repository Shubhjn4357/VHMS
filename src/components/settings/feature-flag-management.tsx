"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Search,
  Settings2,
  ShieldCheck,
} from "lucide-react";

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

type FeatureFlagFilter =
  | "all"
  | "enabled"
  | "locked"
  | "rollout"
  | "role-targeted"
  | "dirty";

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

function parseRolloutPercentage(value: string) {
  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return Math.min(100, Math.max(0, parsed));
}

function areRolesEqual(left: AppRole[], right: AppRole[]) {
  if (left.length !== right.length) {
    return false;
  }

  return [...left].sort().every((role, index) => role === [...right].sort()[index]);
}

function hasDraftChanges(flag: FeatureFlagRecord, draft: FeatureFlagDraft) {
  return draft.enabled !== flag.dbEnabled ||
    parseRolloutPercentage(draft.rolloutPercentage) !== flag.rolloutPercentage ||
    !areRolesEqual(draft.targetRoles, flag.targetRoles);
}

type FeatureFlagManagementProps = {
  hideHeader?: boolean;
};

export function FeatureFlagManagement({ hideHeader = false }: FeatureFlagManagementProps) {
  const flagsQuery = useFeatureFlags();
  const updateFlagMutation = useUpdateFeatureFlag();
  const { canAccess: canManage } = useModuleAccess(["settings.manage"]);
  const [activeFilter, setActiveFilter] = useState<FeatureFlagFilter>("all");
  const [searchValue, setSearchValue] = useState("");
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

  function clearDraft(flagKey: FeatureFlagKey) {
    setDrafts((current) => {
      if (!current[flagKey]) {
        return current;
      }

      const nextDrafts = { ...current };
      delete nextDrafts[flagKey];
      return nextDrafts;
    });
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

  const dirtyDraftCount = flagsQuery.data.flags.filter((flag) =>
    hasDraftChanges(flag, getDraft(flag))
  ).length;
  const normalizedSearch = searchValue.trim().toLowerCase();
  const filterCounts: Record<FeatureFlagFilter, number> = {
    all: flagsQuery.data.flags.length,
    enabled: flagsQuery.data.flags.filter((flag) => flag.resolvedEnabled).length,
    locked: flagsQuery.data.flags.filter((flag) => flag.lockedByEnv).length,
    rollout: flagsQuery.data.flags.filter((flag) => flag.rolloutActive).length,
    "role-targeted": flagsQuery.data.flags.filter((flag) => flag.roleTargeted).length,
    dirty: dirtyDraftCount,
  };
  const filteredFlags = flagsQuery.data.flags.filter((flag) => {
    const draft = getDraft(flag);
    const isDirty = hasDraftChanges(flag, draft);
    const roleLabels = flag.targetRoles.map((role) => ROLE_LABELS[role]).join(" ");
    const searchTarget = `${flag.key} ${flag.description} ${roleLabels}`.toLowerCase();
    const matchesSearch = normalizedSearch.length === 0 ||
      searchTarget.includes(normalizedSearch);

    if (!matchesSearch) {
      return false;
    }

    switch (activeFilter) {
      case "enabled":
        return flag.resolvedEnabled;
      case "locked":
        return flag.lockedByEnv;
      case "rollout":
        return flag.rolloutActive;
      case "role-targeted":
        return flag.roleTargeted;
      case "dirty":
        return isDirty;
      default:
        return true;
    }
  });
  const filterOptions: Array<{
    description: string;
    label: string;
    value: FeatureFlagFilter;
  }> = [
    {
      value: "all",
      label: "All flags",
      description: "Complete workspace",
    },
    {
      value: "enabled",
      label: "Enabled",
      description: "Resolved active modules",
    },
    {
      value: "locked",
      label: "Locked",
      description: "Env-controlled only",
    },
    {
      value: "rollout",
      label: "Rollout",
      description: "Partial percentage rollout",
    },
    {
      value: "role-targeted",
      label: "Role targeted",
      description: "Restricted by role",
    },
    {
      value: "dirty",
      label: "Draft changes",
      description: "Unsaved edits",
    },
  ];

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

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,0.55fr))]">
        <SurfaceCard className="xl:col-span-2">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Workspace controls
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                Search active rollouts and surface unsaved policy changes fast
              </h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Filter the control room by rollout, role targeting, environment locks,
                or unsaved drafts so release operators can work through changes without
                scanning the entire registry.
              </p>
            </div>

            <div className="w-full max-w-md">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Search by key, description, or role
              </label>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search flags, modules, or target roles"
                  type="search"
                  value={searchValue}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {filterOptions.map((option) => (
              <Button
                className="h-auto min-w-[10rem] justify-between rounded-[var(--radius-panel)] px-4 py-3 text-left"
                key={option.value}
                onClick={() => setActiveFilter(option.value)}
                size="sm"
                type="button"
                variant={activeFilter === option.value ? "secondary" : "outline"}
              >
                <span className="flex min-w-0 flex-col items-start">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                    {option.label}
                  </span>
                  <span className="text-[11px] font-medium normal-case text-muted-foreground">
                    {option.description}
                  </span>
                </span>
                <Badge variant={activeFilter === option.value ? "secondary" : "outline"}>
                  {filterCounts[option.value]}
                </Badge>
              </Button>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Matching flags</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {filteredFlags.length}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Current result set after search and filter rules.
          </p>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Unsaved drafts</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {dirtyDraftCount}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Flag cards with local edits not yet persisted to the database.
          </p>
        </SurfaceCard>
      </section>

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
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {value}
            </p>
          </SurfaceCard>
        ))}
      </section>

      <div className="space-y-4">
        {filteredFlags.length === 0
          ? (
            <EmptyState
              className="min-h-[18rem]"
              icon={ShieldCheck}
              title="No feature flags match this view"
              description="Broaden the search or switch filters to review other operational controls."
            />
          )
          : null}

        {filteredFlags.map((flag) => {
          const draft = getDraft(flag);
          const isDirty = hasDraftChanges(flag, draft);
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
                    {isDirty
                      ? <Badge variant="secondary">Draft changed</Badge>
                      : null}
                  </div>
                  <p className="mt-3 text-lg font-semibold text-foreground">
                    {flag.description}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Default {flag.defaultEnabled ? "enabled" : "disabled"} / DB
                    {" "}
                    {flag.dbEnabled ? "enabled" : "disabled"} / Resolved{" "}
                    {flag.resolvedEnabled ? "enabled" : "disabled"}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Rollout {flag.rolloutPercentage}% / Target roles{" "}
                    {flag.targetRoles.length > 0
                      ? flag.targetRoles.map((role) => ROLE_LABELS[role]).join(", ")
                      : "All roles"}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Updated {formatTimestamp(flag.updatedAt)}
                    {flag.updatedByName ? ` by ${flag.updatedByName}` : ""}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {isDirty
                      ? "Draft changes differ from the saved database policy."
                      : "No local edits pending for this rollout policy."}
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
                    <label className="management-subtle-card p-4">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
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
                        <span className="text-sm text-foreground">
                          Keep this module enabled at the DB layer
                        </span>
                      </div>
                    </label>

                    <label className="management-subtle-card p-4">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
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

                  <div className="management-subtle-card p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Role targeting
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {APP_ROLES.map((role) => {
                        const checked = draft.targetRoles.includes(role);

                        return (
                          <label className="management-selection-pill flex items-center gap-3 px-3 py-2" key={role}>
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
                            <span className="text-sm text-foreground">
                              {ROLE_LABELS[role]}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Leave all roles unchecked to allow the flag for every role.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      disabled={!canManage || flag.lockedByEnv || isPending || !isDirty}
                      onClick={() =>
                        updateFlagMutation.mutate({
                          key: flag.key,
                          enabled: draft.enabled,
                          rolloutPercentage: Number(
                            draft.rolloutPercentage || "0",
                          ),
                          targetRoles: draft.targetRoles,
                        }, {
                          onSuccess: () => clearDraft(flag.key),
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
                        clearDraft(flag.key)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      Discard changes
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
                      Load default baseline
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
