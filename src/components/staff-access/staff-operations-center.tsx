"use client";

import { Clock3, Search, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  RecordPreviewDialog,
  RecordPreviewField,
  RecordPreviewSection,
} from "@/components/ui/record-preview-dialog";
import { SurfaceCard } from "@/components/ui/surface-card";
import { ROLE_LABELS } from "@/constants/roles";
import type { StaffAccessRecord, StaffAccessSummary } from "@/types/staffAccess";

type StaffScopeFilter =
  | "all"
  | "approved"
  | "pending"
  | "revoked"
  | "active"
  | "recent";

function formatDateTime(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function entryMatchesSearch(entry: StaffAccessRecord, searchValue: string) {
  const normalized = searchValue.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return [
    entry.displayName,
    entry.email,
    entry.role,
    entry.status,
    entry.userStatus ?? "",
  ].some((value) => value.toLowerCase().includes(normalized));
}

function getStaffScopeLabel(scope: StaffScopeFilter) {
  switch (scope) {
    case "approved":
      return "Approved";
    case "pending":
      return "Pending";
    case "revoked":
      return "Revoked";
    case "active":
      return "Active runtime users";
    case "recent":
      return "Recently signed in";
    default:
      return "All staff";
  }
}

type StaffOperationsCenterProps = {
  entries: StaffAccessRecord[];
  summary: StaffAccessSummary;
};

export function StaffOperationsCenter({
  entries,
  summary,
}: StaffOperationsCenterProps) {
  const [searchValue, setSearchValue] = useState("");
  const [scopeFilter, setScopeFilter] = useState<StaffScopeFilter>("all");
  const [selectedEntry, setSelectedEntry] = useState<StaffAccessRecord | null>(null);

  const filteredEntries = entries.filter((entry) => {
    if (!entryMatchesSearch(entry, searchValue)) {
      return false;
    }

    switch (scopeFilter) {
      case "approved":
        return entry.status === "APPROVED";
      case "pending":
        return entry.status === "PENDING";
      case "revoked":
        return entry.status === "REVOKED";
      case "active":
        return entry.userStatus === "ACTIVE";
      case "recent":
        return Boolean(entry.lastLoginAt);
      default:
        return true;
    }
  });

  const filterCounts: Record<StaffScopeFilter, number> = {
    all: entries.length,
    approved: entries.filter((entry) => entry.status === "APPROVED").length,
    pending: entries.filter((entry) => entry.status === "PENDING").length,
    revoked: entries.filter((entry) => entry.status === "REVOKED").length,
    active: entries.filter((entry) => entry.userStatus === "ACTIVE").length,
    recent: entries.filter((entry) => Boolean(entry.lastLoginAt)).length,
  };
  const filterOptions: Array<{
    description: string;
    label: string;
    value: StaffScopeFilter;
  }> = [
    {
      value: "all",
      label: "All staff",
      description: "Complete roster",
    },
    {
      value: "approved",
      label: "Approved",
      description: "Access is live",
    },
    {
      value: "pending",
      label: "Pending",
      description: "Needs admin review",
    },
    {
      value: "revoked",
      label: "Revoked",
      description: "Access is blocked",
    },
    {
      value: "active",
      label: "Active users",
      description: "Runtime account present",
    },
    {
      value: "recent",
      label: "Recent sign-ins",
      description: "Has login activity",
    },
  ];

  const roleDistribution = Object.entries(
    filteredEntries.reduce<Record<string, number>>((accumulator, entry) => {
      accumulator[entry.role] = (accumulator[entry.role] ?? 0) + 1;
      return accumulator;
    }, {}),
  ).sort((left, right) => right[1] - left[1]);
  const recentLogins = [...filteredEntries]
    .filter((entry) => Boolean(entry.lastLoginAt))
    .sort((left, right) => {
      const leftTime = left.lastLoginAt ? new Date(left.lastLoginAt).getTime() : 0;
      const rightTime = right.lastLoginAt ? new Date(right.lastLoginAt).getTime() : 0;
      return rightTime - leftTime;
    })
    .slice(0, 6);
  const pendingReview = filteredEntries.filter((entry) => entry.status === "PENDING")
    .slice(0, 5);
  const latestActive = recentLogins[0] ?? null;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,0.6fr))]">
        <SurfaceCard className="xl:col-span-2">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Workspace controls
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                Narrow the workforce roster by approval state before opening the access detail
              </h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Search the hospital roster and focus on approved, pending, revoked,
                active, or recently-used identities so staffing review stays fast and
                operationally relevant.
              </p>
            </div>

            <div className="w-full max-w-md">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Search staff
              </label>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Name, email, role, status, or user state"
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
                onClick={() => setScopeFilter(option.value)}
                size="sm"
                type="button"
                variant={scopeFilter === option.value ? "secondary" : "outline"}
              >
                <span className="flex min-w-0 flex-col items-start">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                    {option.label}
                  </span>
                  <span className="text-[11px] font-medium normal-case text-muted-foreground">
                    {option.description}
                  </span>
                </span>
                <Badge variant={scopeFilter === option.value ? "secondary" : "outline"}>
                  {filterCounts[option.value]}
                </Badge>
              </Button>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Matching staff</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {filteredEntries.length}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Current result set inside the active workforce scope.
          </p>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Latest active user</p>
          <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">
            {latestActive ? latestActive.displayName : "No sign-in activity"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {latestActive
              ? `Last login ${formatDateTime(latestActive.lastLoginAt)}`
              : "Staff sign-in history will appear here once runtime activity is recorded."}
          </p>
        </SurfaceCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Approved staff</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {summary.approved}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Invite-approved identities currently allowed through access control.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Pending review</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {summary.pending}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Staff entries still waiting for approval or role correction.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Active runtime users</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {summary.activeUsers}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Approved identities currently backed by an active runtime account.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Role groups visible</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {roleDistribution.length}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Distinct workforce role clusters inside the current filtered view.
          </p>
        </SurfaceCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <SurfaceCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Role distribution
              </p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Staff grouped by their access role inside the current roster filter.
              </p>
            </div>
            <Users className="h-5 w-5 text-brand" />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {roleDistribution.length > 0
              ? roleDistribution.map(([role, count]) => (
                <div className="management-subtle-card p-4" key={role}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {role}
                      </p>
                    </div>
                    <Badge variant="outline">{count} members</Badge>
                  </div>
                </div>
              ))
              : (
                <EmptyState
                  className="min-h-56 md:col-span-2"
                  description="Change the search or scope filter to bring role coverage back into view."
                  icon={Users}
                  title="No role coverage in this view"
                />
              )}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Approval queue
              </p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Staff identities still requiring admin attention.
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 text-brand" />
          </div>

          <div className="mt-5 space-y-3">
            {pendingReview.length > 0
              ? pendingReview.map((entry) => (
                <div className="management-subtle-card p-4" key={entry.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{entry.displayName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{entry.email}</p>
                    </div>
                    <Badge variant="warning">{entry.status}</Badge>
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {ROLE_LABELS[entry.role] ?? entry.role}
                  </p>
                </div>
              ))
              : (
                <EmptyState
                  className="min-h-56"
                  description="There are no pending staff approvals inside the current workspace filter."
                  icon={ShieldCheck}
                  title="Approval queue is clear"
                />
              )}
          </div>
        </SurfaceCard>
      </section>

      <SurfaceCard>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Workforce roster
            </p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Review staff coverage, last-login posture, and access status without leaving the route.
            </p>
          </div>
          <Badge variant="outline">
            {getStaffScopeLabel(scopeFilter)}
          </Badge>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {filteredEntries.length > 0
            ? filteredEntries.map((entry) => (
              <div className="management-subtle-card p-4" key={entry.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{entry.displayName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{entry.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={entry.status === "APPROVED"
                      ? "success"
                      : entry.status === "PENDING"
                      ? "warning"
                      : "outline"}
                    >
                      {entry.status}
                    </Badge>
                    <Badge variant={entry.userStatus === "ACTIVE" ? "secondary" : "outline"}>
                      {entry.userStatus ?? "No user"}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline">{ROLE_LABELS[entry.role] ?? entry.role}</Badge>
                  <Badge variant="outline">{entry.defaultPermissions.length} permissions</Badge>
                </div>

                <p className="mt-4 text-sm text-muted-foreground">
                  Last login: {formatDateTime(entry.lastLoginAt)}
                </p>

                <div className="mt-4">
                  <Button
                    onClick={() => setSelectedEntry(entry)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Clock3 className="h-4 w-4" />
                    View access detail
                  </Button>
                </div>
              </div>
            ))
            : (
              <EmptyState
                className="min-h-72 lg:col-span-2"
                description={`No staff entries match the current ${getStaffScopeLabel(scopeFilter).toLowerCase()} workspace.`}
                icon={Users}
                title="No staff available in this view"
              />
            )}
        </div>
      </SurfaceCard>

      <RecordPreviewDialog
        description={selectedEntry
          ? "Inspect approval state, runtime account posture, and granted permission volume for this staff identity."
          : undefined}
        eyebrow="Staff access detail"
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEntry(null);
          }
        }}
        open={selectedEntry !== null}
        status={selectedEntry
          ? (
            <Badge variant={selectedEntry.status === "APPROVED"
              ? "success"
              : selectedEntry.status === "PENDING"
              ? "warning"
              : "outline"}
            >
              {selectedEntry.status}
            </Badge>
          )
          : undefined}
        title={selectedEntry?.displayName ?? "Staff access detail"}
      >
        {selectedEntry
          ? (
            <>
              <RecordPreviewSection
                description="Primary identity and roster fields."
                icon={Users}
                title="Identity"
              >
                <RecordPreviewField label="Email" value={selectedEntry.email} />
                <RecordPreviewField
                  label="Role"
                  value={ROLE_LABELS[selectedEntry.role] ?? selectedEntry.role}
                />
                <RecordPreviewField label="Access status" value={selectedEntry.status} />
                <RecordPreviewField
                  label="Runtime user"
                  value={selectedEntry.userStatus ?? "Not provisioned"}
                />
              </RecordPreviewSection>

              <RecordPreviewSection
                description="Timing and approval state for the identity."
                icon={ShieldCheck}
                title="Lifecycle"
              >
                <RecordPreviewField
                  label="Approved at"
                  value={formatDateTime(selectedEntry.approvedAt)}
                />
                <RecordPreviewField
                  label="Last login"
                  value={formatDateTime(selectedEntry.lastLoginAt)}
                />
                <RecordPreviewField
                  label="Created"
                  value={formatDateTime(selectedEntry.createdAt)}
                />
                <RecordPreviewField
                  label="Updated"
                  value={formatDateTime(selectedEntry.updatedAt)}
                />
              </RecordPreviewSection>

              <RecordPreviewSection
                className="md:[&>div]:grid-cols-1"
                description="Default permission set carried by this staff record."
                icon={Clock3}
                title="Permission footprint"
              >
                <RecordPreviewField
                  className="md:col-span-1"
                  label="Default permissions"
                  value={selectedEntry.defaultPermissions.length > 0
                    ? selectedEntry.defaultPermissions.join(", ")
                    : "No default permissions"}
                />
              </RecordPreviewSection>
            </>
          )
          : null}
      </RecordPreviewDialog>
    </div>
  );
}
