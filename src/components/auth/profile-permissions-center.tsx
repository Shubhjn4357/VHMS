"use client";

import { KeyRound, Search, ShieldCheck, UserCircle2 } from "lucide-react";
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
import {
  PERMISSION_GROUPS,
  ROLE_PERMISSIONS,
  type PermissionKey,
} from "@/constants/permissions";
import { ROLE_LABELS, type AppRole } from "@/constants/roles";

type PermissionGroupFilter =
  | "all"
  | "dashboard"
  | "patients"
  | "appointments"
  | "doctors"
  | "billing"
  | "wards"
  | "clinical"
  | "administration";

type ProfilePermissionsCenterProps = {
  email: string | null;
  name: string | null;
  permissions: PermissionKey[];
  role: AppRole | null;
};

function getPermissionGroup(permission: PermissionKey): Exclude<PermissionGroupFilter, "all"> {
  const groupEntries = Object.entries(PERMISSION_GROUPS) as Array<
    [Exclude<PermissionGroupFilter, "all">, readonly PermissionKey[]]
  >;

  const match = groupEntries.find(([, permissions]) => permissions.includes(permission));
  return match?.[0] ?? "administration";
}

function getPermissionLabel(permission: PermissionKey) {
  const [scope, action] = permission.split(".");
  return `${scope.replaceAll(/([A-Z])/g, " $1")} ${action}`;
}

function matchesPermissionSearch(permission: PermissionKey, searchValue: string) {
  const normalized = searchValue.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return [
    permission,
    getPermissionLabel(permission),
    getPermissionGroup(permission),
  ].some((value) => value.toLowerCase().includes(normalized));
}

function getPermissionGroupLabel(group: PermissionGroupFilter) {
  switch (group) {
    case "dashboard":
      return "Dashboard";
    case "patients":
      return "Patients";
    case "appointments":
      return "Appointments";
    case "doctors":
      return "Doctors";
    case "billing":
      return "Billing";
    case "wards":
      return "Wards";
    case "clinical":
      return "Clinical";
    case "administration":
      return "Administration";
    default:
      return "All domains";
  }
}

export function ProfilePermissionsCenter({
  email,
  name,
  permissions,
  role,
}: ProfilePermissionsCenterProps) {
  const [searchValue, setSearchValue] = useState("");
  const [groupFilter, setGroupFilter] = useState<PermissionGroupFilter>("all");
  const [selectedPermission, setSelectedPermission] = useState<PermissionKey | null>(null);

  const baselinePermissions = role ? ROLE_PERMISSIONS[role] : [];
  const filteredPermissions = permissions.filter((permission) =>
    matchesPermissionSearch(permission, searchValue) &&
    (groupFilter === "all" || getPermissionGroup(permission) === groupFilter)
  );
  const filterCounts: Record<PermissionGroupFilter, number> = {
    all: permissions.length,
    dashboard: permissions.filter((permission) => getPermissionGroup(permission) === "dashboard")
      .length,
    patients: permissions.filter((permission) => getPermissionGroup(permission) === "patients")
      .length,
    appointments: permissions.filter((permission) =>
      getPermissionGroup(permission) === "appointments"
    ).length,
    doctors: permissions.filter((permission) => getPermissionGroup(permission) === "doctors")
      .length,
    billing: permissions.filter((permission) => getPermissionGroup(permission) === "billing")
      .length,
    wards: permissions.filter((permission) => getPermissionGroup(permission) === "wards").length,
    clinical: permissions.filter((permission) => getPermissionGroup(permission) === "clinical")
      .length,
    administration: permissions.filter((permission) =>
      getPermissionGroup(permission) === "administration"
    ).length,
  };
  const filterOptions: Array<{
    description: string;
    label: string;
    value: PermissionGroupFilter;
  }> = [
    { value: "all", label: "All domains", description: "Full access surface" },
    { value: "dashboard", label: "Dashboard", description: "Overview controls" },
    { value: "patients", label: "Patients", description: "Patient lifecycle" },
    { value: "appointments", label: "Appointments", description: "Visit flow" },
    { value: "doctors", label: "Doctors", description: "Provider admin" },
    { value: "billing", label: "Billing", description: "Finance operations" },
    { value: "wards", label: "Wards", description: "Facility setup" },
    { value: "clinical", label: "Clinical", description: "Occupancy and discharge" },
    { value: "administration", label: "Administration", description: "Admin and reports" },
  ];
  const grantedGroups = Object.entries(
    permissions.reduce<Record<string, number>>((accumulator, permission) => {
      const group = getPermissionGroup(permission);
      accumulator[group] = (accumulator[group] ?? 0) + 1;
      return accumulator;
    }, {}),
  ).sort((left, right) => right[1] - left[1]);
  const extraPermissions = permissions.filter((permission) =>
    !baselinePermissions.includes(permission)
  );
  const missingPermissions = baselinePermissions.filter((permission) =>
    !permissions.includes(permission)
  );
  const alignmentLabel = extraPermissions.length === 0 && missingPermissions.length === 0
    ? "Role aligned"
    : extraPermissions.length > 0
    ? "Expanded access"
    : "Restricted access";
  const topDomain = grantedGroups[0]?.[0] ?? null;

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
                Inspect the permission surface by domain before reviewing a specific grant
              </h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Search the live session permission set and switch between functional
                domains so the signed-in user can quickly understand what access is
                active across the dashboard.
              </p>
            </div>

            <div className="w-full max-w-md">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Search permissions
              </label>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Permission key, action, or domain"
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
                onClick={() => setGroupFilter(option.value)}
                size="sm"
                type="button"
                variant={groupFilter === option.value ? "secondary" : "outline"}
              >
                <span className="flex min-w-0 flex-col items-start">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                    {option.label}
                  </span>
                  <span className="text-[11px] font-medium normal-case text-muted-foreground">
                    {option.description}
                  </span>
                </span>
                <Badge variant={groupFilter === option.value ? "secondary" : "outline"}>
                  {filterCounts[option.value]}
                </Badge>
              </Button>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Matching permissions</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {filteredPermissions.length}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Current result set inside the active permission domain.
          </p>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Top access domain</p>
          <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">
            {topDomain ? getPermissionGroupLabel(topDomain as PermissionGroupFilter) : "No grants"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Highest-volume permission domain in the current session grant set.
          </p>
        </SurfaceCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Identity</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">
            {name ?? "Approved user"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {email ?? "Email not available"}
          </p>
          <Badge className="mt-4 w-fit" variant="outline">
            {role ? ROLE_LABELS[role] : "Role unavailable"}
          </Badge>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Permission count</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {permissions.length}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Effective grants currently active in the signed-in session.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Access alignment</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">{alignmentLabel}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Compared with the baseline permission set for the current role.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Domains unlocked</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {grantedGroups.length}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Functional permission domains visible in the current session.
          </p>
        </SurfaceCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SurfaceCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Access footprint
              </p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Permission domains contributing to the signed-in user&apos;s current access.
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 text-brand" />
          </div>

          <div className="mt-5 space-y-3">
            {grantedGroups.length > 0
              ? grantedGroups.map(([group, count]) => (
                <div className="management-subtle-card p-4" key={group}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {getPermissionGroupLabel(group as PermissionGroupFilter)}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {group}
                      </p>
                    </div>
                    <Badge variant="outline">{count} grants</Badge>
                  </div>
                </div>
              ))
              : (
                <EmptyState
                  className="min-h-56"
                  description="No permission domains are active for this session."
                  icon={ShieldCheck}
                  title="No access footprint"
                />
              )}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Effective permissions
              </p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Open a permission to inspect its domain, action, and role-baseline alignment.
              </p>
            </div>
            <KeyRound className="h-5 w-5 text-brand" />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {filteredPermissions.length > 0
              ? filteredPermissions.map((permission) => (
                <div className="management-subtle-card p-4" key={permission}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {permission}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {getPermissionLabel(permission)}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {getPermissionGroupLabel(getPermissionGroup(permission))}
                    </Badge>
                  </div>

                  <div className="mt-4">
                    <Button
                      onClick={() => setSelectedPermission(permission)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <UserCircle2 className="h-4 w-4" />
                      View grant
                    </Button>
                  </div>
                </div>
              ))
              : (
                <EmptyState
                  className="min-h-72 md:col-span-2"
                  description={`No permissions match the current ${getPermissionGroupLabel(groupFilter).toLowerCase()} view.`}
                  icon={KeyRound}
                  title="No permission grants in this view"
                />
              )}
          </div>
        </SurfaceCard>
      </section>

      <RecordPreviewDialog
        description={selectedPermission
          ? "Inspect the selected permission, its domain, and whether it matches the role baseline."
          : undefined}
        eyebrow="Permission detail"
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPermission(null);
          }
        }}
        open={selectedPermission !== null}
        status={selectedPermission
          ? (
            <Badge variant={baselinePermissions.includes(selectedPermission) ? "success" : "warning"}>
              {baselinePermissions.includes(selectedPermission)
                ? "Role baseline"
                : "Custom variance"}
            </Badge>
          )
          : undefined}
        title={selectedPermission ?? "Permission detail"}
      >
        {selectedPermission
          ? (
            <>
              <RecordPreviewSection
                description="Permission identity and functional routing."
                icon={KeyRound}
                title="Grant detail"
              >
                <RecordPreviewField label="Permission key" value={selectedPermission} />
                <RecordPreviewField
                  label="Action label"
                  value={getPermissionLabel(selectedPermission)}
                />
                <RecordPreviewField
                  label="Permission domain"
                  value={getPermissionGroupLabel(getPermissionGroup(selectedPermission))}
                />
                <RecordPreviewField
                  label="Active filter"
                  value={getPermissionGroupLabel(groupFilter)}
                />
              </RecordPreviewSection>

              <RecordPreviewSection
                description="Role mapping and session-level alignment."
                icon={ShieldCheck}
                title="Role alignment"
              >
                <RecordPreviewField
                  label="Signed-in role"
                  value={role ? ROLE_LABELS[role] : "Role unavailable"}
                />
                <RecordPreviewField
                  label="Included in role baseline"
                  value={baselinePermissions.includes(selectedPermission) ? "Yes" : "No"}
                />
                <RecordPreviewField
                  label="Missing baseline grants"
                  value={missingPermissions.length}
                />
                <RecordPreviewField
                  label="Extra session grants"
                  value={extraPermissions.length}
                />
              </RecordPreviewSection>
            </>
          )
          : null}
      </RecordPreviewDialog>
    </div>
  );
}
