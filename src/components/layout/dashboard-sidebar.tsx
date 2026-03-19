"use client";

import Link from "next/link";

import { Activity, BellRing, Settings2 } from "lucide-react";

import { DashboardNavigation } from "@/components/layout/dashboard-navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_TEXT } from "@/constants/appText";
import { APP_THEME } from "@/constants/appTheme";
import type { PermissionKey } from "@/constants/permissions";
import { useDashboardOverview } from "@/hooks/useAnalyticsApi";
import { resolveDashboardRouteContext } from "@/lib/dashboard/route-context";
import type { NavGroup } from "@/lib/module-config";
import { cn } from "@/lib/utils/cn";

type DashboardSidebarProps = {
  navGroups: NavGroup[];
  pathname: string;
  permissions: PermissionKey[];
  collapsed: boolean;
};

export function DashboardSidebar({
  navGroups,
  pathname,
  permissions,
  collapsed,
}: DashboardSidebarProps) {
  const overviewQuery = useDashboardOverview();
  const occupiedBeds = overviewQuery.data?.summary.occupiedBeds ?? 0;
  const totalBeds = overviewQuery.data?.summary.totalBeds ?? 0;
  const pendingApprovals = overviewQuery.data?.summary.pendingApprovals ?? 0;
  const unreadNotifications = overviewQuery.data?.summary.unreadNotifications ?? 0;
  const routeContext = resolveDashboardRouteContext(pathname, navGroups, permissions);
  const occupancyPercentage = Math.round(
    (occupiedBeds / Math.max(totalBeds, 1)) * 100,
  );

  return (
    <aside
      className="hidden min-h-0 shrink-0 transition-[width] duration-300 lg:flex lg:flex-col"
      style={{
        width: collapsed
          ? `${APP_THEME.layout.sidebarCollapsedWidth}px`
          : `${APP_THEME.layout.sidebarExpandedWidth}px`,
      }}
    >
      <div
        className={cn(
          "flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-panel)] border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[var(--shadow-card)]",
          collapsed ? "px-2 py-3" : "px-3 py-3",
        )}
      >
        <div
          className={cn(
            "border-b border-sidebar-border pb-4",
            collapsed ? "flex min-h-[72px] items-center justify-center" : "px-2 pt-2",
          )}
        >
          {collapsed ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-accent text-sm font-semibold text-sidebar-accent-foreground">
              {APP_TEXT.BRAND_SHORT}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/60">
                    {APP_TEXT.SHELL.OVERLINE}
                  </p>
                  <h1 className="mt-2 text-lg font-semibold tracking-tight text-sidebar-foreground">
                    {APP_TEXT.BRAND_NAME}
                  </h1>
                </div>
                <Badge
                  className="border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground"
                  variant="outline"
                >
                  {APP_TEXT.SHELL.OPERATION_LABEL}
                </Badge>
              </div>
              <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/70 p-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/60">
                  {routeContext.sectionTitle}
                </p>
                <h2 className="mt-2 text-base font-semibold text-sidebar-foreground">
                  {routeContext.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-sidebar-foreground/70">
                  {routeContext.detail}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-1 py-4 scrollbar-none">
          <DashboardNavigation
            collapsed={collapsed}
            navGroups={navGroups}
            pathname={pathname}
            permissions={permissions}
          />
        </div>

        {!collapsed ? (
          <div className="border-t border-sidebar-border px-2 pt-4">
            <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/60">
                    {APP_TEXT.SHELL.OCCUPANCY_TITLE}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-sidebar-foreground">
                    {occupiedBeds}
                    <span className="px-1 text-sidebar-foreground/30">/</span>
                    {totalBeds}
                  </p>
                </div>
                <Badge
                  className="border-transparent bg-sidebar-primary text-sidebar-primary-foreground"
                  variant="secondary"
                >
                  {occupancyPercentage}% active
                </Badge>
              </div>

              <p className="mt-2 text-sm text-sidebar-foreground/70">
                {APP_TEXT.SHELL.OCCUPANCY_DESCRIPTION}
              </p>

              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-sidebar-border">
                <div
                  className="h-full rounded-full bg-sidebar-primary transition-all duration-500"
                  style={{ width: `${occupancyPercentage}%` }}
                />
              </div>

              <div className="mt-5 grid gap-3">
                <div className="rounded-lg border border-sidebar-border bg-sidebar px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground">
                        <Activity className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold tracking-tight text-sidebar-foreground">
                          Pending approvals
                        </p>
                        <p className="text-xs text-sidebar-foreground/60">
                          Discharge, consent, and workflow checks
                        </p>
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-sidebar-foreground">
                      {pendingApprovals}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-sidebar-border bg-sidebar px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground">
                        <BellRing className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold tracking-tight text-sidebar-foreground">
                          Unread alerts
                        </p>
                        <p className="text-xs text-sidebar-foreground/60">
                          Review queue and staff notifications
                        </p>
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-sidebar-foreground">
                      {unreadNotifications}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Button
                  asChild
                  className="min-w-0 border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar hover:text-sidebar-foreground"
                  size="sm"
                  variant="outline"
                >
                  <Link href="/dashboard/reports">Reports</Link>
                </Button>
                <Button
                  asChild
                  className="min-w-0 border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar hover:text-sidebar-foreground"
                  size="sm"
                  variant="outline"
                >
                  <Link href="/dashboard/settings">
                    <Settings2 className="h-4 w-4" />
                    Settings
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
