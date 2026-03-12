"use client";

import type { PermissionKey } from "@/constants/permissions";
import { resolveDashboardRouteContext } from "@/lib/dashboard/route-context";
import type { NavGroup } from "@/lib/module-config";
import { DashboardNavigation } from "@/components/layout/dashboard-navigation";
import { Card, CardContent } from "@/components/ui/card";
import { useDashboardOverview } from "@/hooks/useAnalyticsApi";
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
  const routeContext = resolveDashboardRouteContext(pathname, navGroups, permissions);

  return (
    <aside
      className={cn(
        "hidden h-full shrink-0 transition-[width] duration-200 lg:flex lg:flex-col",
        collapsed ? "w-[4.75rem]" : "w-[15rem] xl:w-[16rem]",
      )}
    >
      <div
        className={cn(
          "glass-hero rounded-[24px] p-4",
          collapsed && "flex items-center justify-center p-3",
        )}
      >
        {collapsed
          ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/10 text-sm font-semibold">
              VH
            </div>
          )
          : (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/64">
                {routeContext.sectionTitle}
              </p>
              <h1 className="mt-3 text-[1.1rem] font-semibold tracking-tight">
                {routeContext.title}
              </h1>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/74">
                {routeContext.detail}
              </p>
            </>
          )}
      </div>

      <Card className="mt-4 min-h-0 flex-1 overflow-hidden">
        <CardContent
          className={cn(
            "h-full overflow-y-auto pt-4",
            collapsed && "pb-2 pt-2",
          )}
        >
          <DashboardNavigation
            collapsed={collapsed}
            navGroups={navGroups}
            pathname={pathname}
            permissions={permissions}
          />
        </CardContent>
      </Card>

      {!collapsed
        ? (
          <Card className="mt-auto">
            <CardContent className="pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Hospital pulse
              </p>
              <div className="mt-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-2xl font-semibold tracking-tight text-foreground">
                    {occupiedBeds}/{totalBeds}
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    beds occupied
                  </p>
                </div>
                <div className="relative h-[3.5rem] w-[3.5rem] rounded-full border-[8px] border-primary/16 border-t-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
                  <div className="absolute inset-1.5 rounded-full bg-white/40 dark:bg-white/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        )
        : null}
    </aside>
  );
}
