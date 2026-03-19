import { dashboardStaffMetadata as metadata } from "@/app/dashboard/page-metadata";
import Link from "next/link";
import { ShieldCheck, Users } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { ROLE_LABELS } from "@/constants/roles";
import { listStaffAccess } from "@/lib/staff-access/service";

export { metadata };

function formatDateTime(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function DashboardStaffPage() {
  const workspace = await listStaffAccess();
  const roleDistribution = Object.entries(
    workspace.entries.reduce<Record<string, number>>((accumulator, entry) => {
      accumulator[entry.role] = (accumulator[entry.role] ?? 0) + 1;
      return accumulator;
    }, {}),
  ).sort((left, right) => right[1] - left[1]);
  const recentLogins = [...workspace.entries]
    .filter((entry) => Boolean(entry.lastLoginAt))
    .sort((left, right) => {
      const leftTime = left.lastLoginAt ? new Date(left.lastLoginAt).getTime() : 0;
      const rightTime = right.lastLoginAt ? new Date(right.lastLoginAt).getTime() : 0;
      return rightTime - leftTime;
    })
    .slice(0, 6);
  const pendingReview = workspace.entries.filter((entry) => entry.status === "PENDING");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workforce"
        title="Staff operations"
        description="Review active hospital users, approval posture, role distribution, and recent sign-in activity from a route focused on runtime staff coverage."
        actions={
          <>
            <Link className={buttonVariants({ variant: "outline" })} href="/dashboard/profile">
              Open profile
            </Link>
            <Link className={buttonVariants({ variant: "outline" })} href="/dashboard/staff-access">
              Manage staff access
            </Link>
          </>
        }
      />

      <section className="grid gap-4 lg:grid-cols-4">
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Approved staff</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {workspace.summary.approved}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Staff entries currently approved for invite-only sign-in.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Pending review</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {workspace.summary.pending}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Access records still waiting for admin approval or revision.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Active users</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {workspace.summary.activeUsers}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Approved identities that currently resolve to active runtime accounts.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Role groups</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {roleDistribution.length}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Distinct operational role clusters represented in the current staff roster.
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
                Staff grouped by the access role that controls module visibility and action permissions.
              </p>
            </div>
            <Users className="h-5 w-5 text-brand" />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {roleDistribution.map(([role, count]) => (
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
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Approval queue
              </p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Staff identities that still require approval before protected routes become available.
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 text-brand" />
          </div>

          <div className="mt-5 space-y-3">
            {pendingReview.length > 0
              ? pendingReview.slice(0, 5).map((entry) => (
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
                  description="There are no pending staff approvals right now."
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
              Recently active staff
            </p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Latest approved sign-ins recorded for staff access entries.
            </p>
          </div>
          <Link className={buttonVariants({ size: "sm", variant: "outline" })} href="/dashboard/staff-access">
            Open full staff directory
          </Link>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {recentLogins.length > 0
            ? recentLogins.map((entry) => (
              <div className="management-subtle-card p-4" key={entry.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{entry.displayName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{entry.email}</p>
                  </div>
                  <Badge variant={entry.userStatus === "ACTIVE" ? "success" : "outline"}>
                    {entry.userStatus ?? "No user"}
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline">{ROLE_LABELS[entry.role] ?? entry.role}</Badge>
                  <Badge variant={entry.status === "APPROVED" ? "success" : "warning"}>
                    {entry.status}
                  </Badge>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Last login: {formatDateTime(entry.lastLoginAt)}
                </p>
              </div>
            ))
            : (
              <EmptyState
                className="min-h-56 lg:col-span-2"
                description="Approved sign-ins will appear here after staff begin using the dashboard."
                icon={Users}
                title="No sign-in activity yet"
              />
            )}
        </div>
      </SurfaceCard>
    </div>
  );
}
