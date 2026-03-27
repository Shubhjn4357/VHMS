"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Globe,
  Menu,
  LayoutDashboard,
  LineChart,
  ShieldCheck,
  Settings2,
} from "lucide-react";

import { AuthUserPanel } from "@/components/auth/auth-user-panel";
import { DashboardNavigation } from "@/components/layout/dashboard-navigation";
import { GlobalSearch } from "@/components/layout/global-search";
import { OfflineStatusChip } from "@/components/pwa/offline-status-chip";
import { SyncHealthChip } from "@/components/pwa/sync-health-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OverflowMenu } from "@/components/ui/overflow-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { APP_TEXT } from "@/constants/appText";
import type { PermissionKey } from "@/constants/permissions";
import { useAppShell } from "@/hooks/useAppShell";
import { resolveDashboardRouteContext } from "@/lib/dashboard/route-context";
import type { NavGroup } from "@/lib/module-config";

type DashboardTopbarProps = {
  navGroups: NavGroup[];
  pathname: string;
  permissions: PermissionKey[];
};

export function DashboardTopbar({
  navGroups,
  pathname,
  permissions,
}: DashboardTopbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isDesktop } = useAppShell();
  const routeContext = resolveDashboardRouteContext(pathname, navGroups, permissions);
  const commandMenuItems = [
    {
      label: APP_TEXT.SHELL.PUBLIC_SITE,
      description: "Open the public-facing hospital site.",
      href: "/",
      icon: Globe,
    },
    {
      label: "Dashboard home",
      description: "Return to the main operations dashboard.",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Reports",
      description: "Open reporting and analytics workspaces.",
      href: "/dashboard/reports",
      icon: LineChart,
    },
    {
      label: "Workspace settings",
      description: "Hospital profile, feature flags, and print templates.",
      href: "/dashboard/settings",
      icon: Settings2,
    },
    {
      label: "Access control",
      description: "Review staff access, permissions, and audit operations.",
      href: "/dashboard/staff-access",
      icon: ShieldCheck,
    },
  ];

  return (
    <Sheet
      onOpenChange={(open) => setIsMobileMenuOpen(open)}
      open={!isDesktop && isMobileMenuOpen}
    >
      <header
        className="sticky top-0 z-30 mx-1 mt-1 rounded-[calc(var(--radius-panel)+0.15rem)] border border-border/75 bg-background/88 px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur supports-[backdrop-filter]:bg-background/72 sm:px-5 lg:px-6"
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 items-center gap-2">
              <SheetTrigger asChild>
                <Button
                  aria-label={APP_TEXT.SHELL.MENU_TITLE}
                  className="lg:hidden"
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <Link
                className="inline-flex items-center rounded-full border border-border/70 bg-card/90 px-3 py-2 text-sm font-semibold tracking-tight text-foreground shadow-[var(--shadow-soft)] transition-colors hover:bg-accent hover:text-accent-foreground"
                href="/"
              >
                {APP_TEXT.BRAND_NAME}
              </Link>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {routeContext.sectionTitle}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <h2 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                  {routeContext.title}
                </h2>
                <Badge className="hidden rounded-full md:inline-flex" variant="outline">
                  {APP_TEXT.SHELL.OPERATION_LABEL}
                </Badge>
              </div>
              <p className="mt-1 hidden truncate text-sm text-muted-foreground lg:block">
                {routeContext.detail}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden lg:block lg:w-[20rem]">
                <GlobalSearch compact key={pathname} />
              </div>
              <div className="hidden lg:block">
                <OverflowMenu
                  items={commandMenuItems}
                  key={`${pathname}-commands`}
                  triggerClassName="rounded-full border-border/70 bg-card/90 shadow-[var(--shadow-soft)]"
                />
              </div>
              <AuthUserPanel compact={!isDesktop} />
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:hidden">
            <div className="min-w-0">
              <GlobalSearch compact={false} key={pathname} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <OfflineStatusChip />
              <SyncHealthChip />
            </div>
          </div>
        </div>
      </header>

      <SheetContent className="w-[min(92vw,24rem)] p-0" side="left">
        <div className="flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain">
          <div className="flex min-h-full flex-col">
            <SheetHeader className="border-b px-5 py-4 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{routeContext.sectionTitle}</Badge>
                <Badge variant="outline">{APP_TEXT.SHELL.OPERATION_LABEL}</Badge>
              </div>
              <SheetTitle className="pt-2 text-xl font-semibold">
                {APP_TEXT.SHELL.MENU_TITLE}
              </SheetTitle>
              <SheetDescription>{APP_TEXT.SHELL.MENU_DESCRIPTION}</SheetDescription>
            </SheetHeader>

            <div className="border-b px-5 py-4">
              <AuthUserPanel compact={false} />
            </div>

            <div className="border-b px-5 py-4">
              <div className="flex flex-wrap gap-2">
                <OfflineStatusChip />
                <SyncHealthChip />
              </div>
            </div>

            <div className="flex-1 px-4 py-4">
              <DashboardNavigation
                navGroups={navGroups}
                onNavigate={() => setIsMobileMenuOpen(false)}
                pathname={pathname}
                permissions={permissions}
              />
            </div>

            <div className="mt-auto border-t px-5 py-4">
              <div className="grid gap-2">
                {commandMenuItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Button
                      asChild
                      className="justify-start"
                      key={item.label}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Link href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                        {Icon ? <Icon className="h-4 w-4" /> : null}
                        {item.label}
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
