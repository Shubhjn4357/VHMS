"use client";

import Link from "next/link";

import {
  BedDouble,
  BellRing,
  FileSpreadsheet,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  ShieldAlert,
} from "lucide-react";

import { DashboardNavigation } from "@/components/layout/dashboard-navigation";
import { APP_TEXT } from "@/constants/appText";
import { APP_THEME } from "@/constants/appTheme";
import type { PermissionKey } from "@/constants/permissions";
import { useDashboardOverview } from "@/hooks/useAnalyticsApi";
import { useAppShell } from "@/hooks/useAppShell";
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
  const { setSidebarCollapsed } = useAppShell();
  const liveStatusItems = [
    {
      label: "Beds",
      value: `${occupiedBeds}/${totalBeds}`,
      icon: BedDouble,
    },
    {
      label: "Pending",
      value: String(pendingApprovals),
      icon: ShieldAlert,
    },
    {
      label: "Alerts",
      value: String(unreadNotifications),
      icon: BellRing,
    },
  ] as const;

  return (
    <aside
      className="hidden shrink-0 transition-[width] duration-150 ease-out lg:sticky lg:top-4 lg:flex lg:h-[calc(100dvh-2rem)] lg:flex-col lg:self-start"
      style={{
        willChange: "width",
        width: collapsed
          ? `${APP_THEME.layout.sidebarCollapsedWidth}px`
          : `${APP_THEME.layout.sidebarExpandedWidth}px`,
      }}
    >
      <div
        className={cn(
          "h-[calc(100dvh-2rem)] min-h-0 overflow-y-auto overscroll-contain rounded-[calc(var(--radius-panel)+0.35rem)] border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[var(--shadow-soft)]",
          collapsed ? "px-2 py-3" : "px-3 py-4",
        )}
      >
        <div className="flex min-h-full flex-col">
          <div
            className={cn(
              "shrink-0 border-b border-sidebar-border/80 pb-4",
              collapsed ? "px-1 pt-1" : "px-2 pt-2",
            )}
          >
            <div className={cn("space-y-3", collapsed && "space-y-4")}>
              <div
                className={cn(
                  "flex items-center gap-2",
                  collapsed ? "flex-col" : "justify-between",
                )}
              >
                <Link
                  className={cn(
                    "flex items-center text-sidebar-foreground hover:text-sidebar-accent-foreground",
                    collapsed
                      ? "h-12 w-12 justify-center rounded-2xl bg-sidebar-accent/35 text-sm font-semibold"
                      : "min-w-0 flex-1 rounded-2xl px-1 py-1",
                  )}
                  href="/dashboard"
                  title={collapsed ? APP_TEXT.BRAND_NAME : undefined}
                >
                  {collapsed ? (
                    APP_TEXT.BRAND_SHORT
                  ) : (
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/50">
                        {APP_TEXT.SHELL.OPERATION_LABEL}
                      </p>
                      <p className="mt-1 truncate text-lg font-semibold tracking-tight text-sidebar-foreground">
                        {APP_TEXT.BRAND_NAME}
                      </p>
                    </div>
                  )}
                </Link>
                <button
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  className={cn(
                    "shrink-0 rounded-xl border border-transparent bg-transparent text-sidebar-foreground/65 outline-none hover:bg-sidebar-accent/45 hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                    collapsed ? "h-10 w-10 rounded-2xl" : "rounded-xl",
                  )}
                  onClick={() => setSidebarCollapsed(!collapsed)}
                  type="button"
                >
                  {collapsed ? (
                    <PanelLeftOpen className="h-4 w-4" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </button>
              </div>

              {!collapsed ? (
                <div className="space-y-3 px-1">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-sidebar-foreground/45">
                      {routeContext.sectionTitle}
                    </p>
                    <p className="mt-1 text-sm font-semibold tracking-tight text-sidebar-foreground">
                      {routeContext.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-sidebar-foreground/58">
                      {routeContext.detail}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {liveStatusItems.map((item) => {
                      const Icon = item.icon;

                      return (
                        <div
                          className="rounded-[calc(var(--radius-control)+0.05rem)] bg-sidebar-accent/24 px-2.5 py-2"
                          key={item.label}
                        >
                          <Icon className="h-3.5 w-3.5 text-sidebar-primary" />
                          <p className="mt-2 truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
                            {item.value}
                          </p>
                          <p className="text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/45">
                            {item.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className={cn("flex-1 py-4", collapsed ? "px-0" : "px-1")}>
            <DashboardNavigation
              collapsed={collapsed}
              navGroups={navGroups}
              pathname={pathname}
              permissions={permissions}
            />
          </div>

          <div
            className={cn(
              "mt-auto border-t border-sidebar-border/80 pt-4",
              collapsed ? "px-1" : "px-2",
            )}
          >
            {collapsed ? (
              <div className="flex flex-col items-center gap-2">
                <Link
                  aria-label="Reports"
                  className="flex h-10 w-10 items-center justify-center rounded-2xl text-sidebar-foreground/65 hover:bg-sidebar-accent/45 hover:text-sidebar-accent-foreground"
                  href="/dashboard/reports"
                  title="Reports"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                </Link>
                <Link
                  aria-label="Settings"
                  className="flex h-10 w-10 items-center justify-center rounded-2xl text-sidebar-foreground/65 hover:bg-sidebar-accent/45 hover:text-sidebar-accent-foreground"
                  href="/dashboard/settings"
                  title="Settings"
                >
                  <Settings2 className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-sidebar-foreground/45">
                    Shortcuts
                  </p>
                </div>

                <div className="grid gap-1.5">
                  <Link
                    className="flex min-w-0 items-center justify-start gap-2 rounded-[calc(var(--radius-control)+0.1rem)] px-3 py-2.5 text-sm font-medium text-sidebar-foreground/72 hover:bg-sidebar-accent/45 hover:text-sidebar-accent-foreground"
                    href="/dashboard/reports"
                  >
                    <FileSpreadsheet className="h-4 w-4 shrink-0" />
                    Reports
                  </Link>
                  <Link
                    className="flex min-w-0 items-center justify-start gap-2 rounded-[calc(var(--radius-control)+0.1rem)] px-3 py-2.5 text-sm font-medium text-sidebar-foreground/72 hover:bg-sidebar-accent/45 hover:text-sidebar-accent-foreground"
                    href="/dashboard/settings"
                  >
                    <Settings2 className="h-4 w-4 shrink-0" />
                    Settings
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
