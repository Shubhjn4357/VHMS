"use client";

import Link from "next/link";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { AuthUserPanel } from "@/components/auth/auth-user-panel";
import { DashboardNavigation } from "@/components/layout/dashboard-navigation";
import { GlobalSearch } from "@/components/layout/global-search";
import { OfflineStatusChip } from "@/components/pwa/offline-status-chip";
import { SyncHealthChip } from "@/components/pwa/sync-health-chip";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { PermissionKey } from "@/constants/permissions";
import { resolveDashboardRouteContext } from "@/lib/dashboard/route-context";
import type { NavGroup } from "@/lib/module-config";
import { cn } from "@/lib/utils/cn";

type DashboardTopbarProps = {
  condensed: boolean;
  navGroups: NavGroup[];
  pathname: string;
  permissions: PermissionKey[];
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
};

function hasAccess(
  permissions: PermissionKey[],
  requiredPermissions?: PermissionKey[],
) {
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  return requiredPermissions.every((permission) => permissions.includes(permission));
}

function isActiveRoute(pathname: string, href?: string) {
  if (!href) {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardTopbar({
  condensed,
  navGroups,
  pathname,
  permissions,
  isSidebarCollapsed,
  onToggleSidebar,
}: DashboardTopbarProps) {
  const routeContext = resolveDashboardRouteContext(pathname, navGroups, permissions);
  const quickLinks = routeContext.quickLinks.filter((item) =>
    hasAccess(permissions, item.permissions)
  );

  return (
    <header
      className={cn(
        "glass-panel-strong z-30 overflow-hidden transition-[padding,border-radius,box-shadow,background-color] duration-200",
        condensed
          ? "rounded-[20px] px-4 py-2 shadow-[0_12px_28px_rgba(15,23,42,0.08)] sm:px-4"
          : "rounded-[24px] px-4 py-3 sm:px-5",
      )}
    >
      <div className={cn("flex flex-col transition-[gap] duration-200", condensed ? "gap-2" : "gap-3")}>
        <div
          className={cn(
            "flex flex-col xl:grid xl:grid-cols-[minmax(12rem,0.9fr)_minmax(18rem,32rem)_auto] xl:items-center transition-[gap] duration-200",
            condensed ? "gap-2" : "gap-3",
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <Button
              className="hidden lg:inline-flex"
              onClick={onToggleSidebar}
              size="icon"
              type="button"
              variant="outline"
            >
              {isSidebarCollapsed
                ? <PanelLeftOpen className="h-4 w-4" />
                : <PanelLeftClose className="h-4 w-4" />}
              <span className="sr-only">Toggle sidebar</span>
            </Button>

            <div className="min-w-0">
              <p
                className={cn(
                  "overflow-hidden text-[10px] font-semibold uppercase tracking-[0.24em] text-primary transition-[max-height,opacity,margin] duration-200",
                  condensed ? "max-h-0 opacity-0" : "max-h-5 opacity-100",
                )}
              >
                {routeContext.sectionTitle}
              </p>
              <h2
                className={cn(
                  "font-semibold tracking-tight text-foreground transition-[font-size,margin] duration-200",
                  condensed ? "mt-0 text-[0.95rem]" : "mt-1 text-lg",
                )}
              >
                {routeContext.title}
              </h2>
              <p
                className={cn(
                  "overflow-hidden text-sm leading-6 text-muted-foreground transition-[max-height,opacity,margin] duration-200",
                  condensed ? "max-h-0 opacity-0" : "mt-1 max-h-14 opacity-100",
                )}
              >
                {routeContext.detail}
              </p>
            </div>
          </div>

          <div className="min-w-0">
            <GlobalSearch compact={condensed} key={pathname} />
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:justify-end">
            <div className="hidden items-center gap-2 lg:flex">
              <OfflineStatusChip />
              <SyncHealthChip />
              <ThemeToggle compact={condensed} />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              {!condensed
                ? (
                  <Link
                    className={buttonVariants({ size: "sm", variant: "outline" })}
                    href="/"
                  >
                    Public site
                  </Link>
                )
                : null}

              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    className="lg:hidden"
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <Menu className="h-4 w-4" />
                    <span className="sr-only">Open navigation</span>
                  </Button>
                </SheetTrigger>
                <SheetContent className="overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Dashboard navigation</SheetTitle>
                    <SheetDescription>
                      Access-aware module navigation and runtime controls.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex items-center gap-3">
                    <OfflineStatusChip />
                    <SyncHealthChip />
                    <ThemeToggle />
                  </div>
                  <DashboardNavigation
                    navGroups={navGroups}
                    pathname={pathname}
                    permissions={permissions}
                  />
                </SheetContent>
              </Sheet>

              <AuthUserPanel compact={condensed} />
            </div>
          </div>
        </div>

        <div
          className={cn(
            "overflow-hidden transition-[max-height,opacity,margin] duration-200",
            condensed ? "pointer-events-none -mt-1 max-h-0 opacity-0" : "max-h-16 opacity-100",
          )}
        >
          <div className="hidden items-center gap-2 overflow-x-auto xl:flex">
            {quickLinks.map((item) => {
              const active = isActiveRoute(pathname, item.href);

              return (
                <Link
                    className={active
                      ? "rounded-full bg-surface-strong px-4 py-2 text-sm font-medium text-white"
                      : "rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-white/60 hover:text-foreground dark:hover:bg-white/6"}
                    href={item.href!}
                  key={item.label}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
