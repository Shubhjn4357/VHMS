"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Globe,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
} from "lucide-react";

import { AuthUserPanel } from "@/components/auth/auth-user-panel";
import { DashboardNavigation } from "@/components/layout/dashboard-navigation";
import { GlobalSearch } from "@/components/layout/global-search";
import { OfflineStatusChip } from "@/components/pwa/offline-status-chip";
import { SyncHealthChip } from "@/components/pwa/sync-health-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OptionsMenu } from "@/components/ui/options-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { APP_TEXT } from "@/constants/appText";
import type { PermissionKey } from "@/constants/permissions";
import { useAppShell } from "@/hooks/useAppShell";
import { resolveDashboardRouteContext } from "@/lib/dashboard/route-context";
import type { NavGroup } from "@/lib/module-config";
import { cn } from "@/lib/utils/cn";

type DashboardTopbarProps = {
  navGroups: NavGroup[];
  pathname: string;
  permissions: PermissionKey[];
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
  navGroups,
  pathname,
  permissions,
}: DashboardTopbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const {
    isDesktop,
    isSidebarCollapsed,
    isTopbarCondensed,
    toggleSidebar,
  } = useAppShell();
  const routeContext = resolveDashboardRouteContext(pathname, navGroups, permissions);
  const quickLinks = routeContext.quickLinks.filter((item) =>
    hasAccess(permissions, item.permissions)
  );
  const commandMenuItems = [
    ...(isDesktop
      ? [{
          label: isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar",
          description: "Adjust the navigation density for focused or broad work.",
          onSelect: toggleSidebar,
          icon: isSidebarCollapsed ? PanelLeftOpen : PanelLeftClose,
        }]
      : []),
    {
      label: APP_TEXT.SHELL.PUBLIC_SITE,
      description: "Open the public-facing product and marketing surface.",
      href: "/",
      icon: Globe,
    },
    {
      label: "Workspace settings",
      description: "Hospital profile, feature flags, and print templates.",
      href: "/dashboard/settings",
      icon: Settings2,
    },
  ];

  return (
    <Sheet
      onOpenChange={(open) => setIsMobileMenuOpen(open)}
      open={!isDesktop && isMobileMenuOpen}
    >
      <header
        className={cn(
          "sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 transition-all duration-300",
          isTopbarCondensed
            ? "px-4 py-3 sm:px-5 lg:px-6"
            : "px-4 py-4 sm:px-5 lg:px-6",
        )}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="flex shrink-0 items-center gap-2 pt-0.5">
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
                <Button
                  className="hidden lg:inline-flex"
                  onClick={toggleSidebar}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  {isSidebarCollapsed
                    ? <PanelLeftOpen className="h-5 w-5" />
                    : <PanelLeftClose className="h-5 w-5" />}
                </Button>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{routeContext.sectionTitle}</Badge>
                  <Badge variant="outline">{APP_TEXT.SHELL.OPERATION_LABEL}</Badge>
                </div>
                <h2
                  className={cn(
                    "mt-3 font-semibold tracking-tight text-foreground transition-all",
                    isTopbarCondensed
                      ? "text-xl sm:text-2xl"
                      : "text-[1.5rem] sm:text-[1.85rem]",
                  )}
                >
                  {routeContext.title}
                </h2>
                <p
                  className={cn(
                    "mt-2 max-w-3xl text-sm leading-6 text-muted-foreground",
                    isTopbarCondensed ? "line-clamp-1" : "line-clamp-2",
                  )}
                >
                  {routeContext.detail}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
              <Button asChild className="hidden md:inline-flex" size="sm" variant="ghost">
                <Link href="/">{APP_TEXT.SHELL.PUBLIC_SITE}</Link>
              </Button>
              <OptionsMenu items={commandMenuItems} key={`${pathname}-commands`} />
              <ThemeToggle compact={!isDesktop || isTopbarCondensed} />
              <AuthUserPanel compact={!isDesktop || isTopbarCondensed} />
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 flex-1 xl:max-w-3xl">
              <GlobalSearch compact={isTopbarCondensed} key={pathname} />
            </div>
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <OfflineStatusChip />
              <SyncHealthChip />
            </div>
          </div>

          {quickLinks.length > 0 ? (
            <div
              className={cn(
                "overflow-hidden transition-all duration-300",
                isTopbarCondensed ? "max-h-0 opacity-0" : "max-h-14 opacity-100",
              )}
            >
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {quickLinks.map((item) => {
                  const active = isActiveRoute(pathname, item.href);

                  return (
                    <Link
                      className={cn(
                        "whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-secondary text-secondary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                      href={item.href!}
                      key={item.label}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <SheetContent className="w-[min(92vw,24rem)] p-0" side="left">
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

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <DashboardNavigation
              navGroups={navGroups}
              onNavigate={() => setIsMobileMenuOpen(false)}
              pathname={pathname}
              permissions={permissions}
            />
          </div>

          <div className="border-t px-5 py-4">
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" type="button" variant="outline">
                <Link href="/">{APP_TEXT.SHELL.PUBLIC_SITE}</Link>
              </Button>
              <Button asChild size="sm" type="button" variant="outline">
                <Link href="/dashboard/settings">Settings</Link>
              </Button>
            </div>
          </div>
      </SheetContent>
    </Sheet>
  );
}
