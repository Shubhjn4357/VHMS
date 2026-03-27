"use client";

import Link from "next/link";

import { getDashboardNavIcon } from "@/components/layout/dashboard-nav-icons";
import type { PermissionKey } from "@/constants/permissions";
import type { NavGroup } from "@/lib/module-config";
import { cn } from "@/lib/utils/cn";

function hasAccess(
  currentPermissions: PermissionKey[],
  requiredPermissions?: PermissionKey[],
) {
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  return requiredPermissions.every((permission) =>
    currentPermissions.includes(permission)
  );
}

function isActiveRoute(pathname: string, href?: string) {
  if (!href) {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

type DashboardNavigationProps = {
  navGroups: NavGroup[];
  pathname: string;
  permissions: PermissionKey[];
  collapsed?: boolean;
  onNavigate?: () => void;
};

export function DashboardNavigation({
  navGroups,
  pathname,
  permissions,
  collapsed = false,
  onNavigate,
}: DashboardNavigationProps) {
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        hasAccess(permissions, item.permissions)
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className={cn("space-y-4", collapsed && "space-y-3")}>
      {visibleGroups.map((group) => (
        <section className="min-w-0 space-y-2" key={group.title}>
          {!collapsed ? (
            <div className="px-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-sidebar-foreground/45">
                {group.title}
              </p>
            </div>
          ) : null}

          <div className="space-y-1">
            {group.items.map((item) =>
              item.href
                ? (() => {
                    const Icon = getDashboardNavIcon(item.href);
                    const active = isActiveRoute(pathname, item.href);

                    return (
                      <Link
                        aria-label={item.label}
                        className={cn(
                          "group relative flex min-w-0 items-center gap-3 rounded-[calc(var(--radius-control)+0.1rem)] px-3 py-2.5 text-sm",
                          active
                            ? "bg-sidebar-primary/10 text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/72 hover:bg-sidebar-accent/45 hover:text-sidebar-accent-foreground",
                          collapsed && "mx-auto h-11 w-11 justify-center rounded-2xl px-0",
                        )}
                        href={item.href}
                        key={item.label}
                        onClick={onNavigate}
                        title={collapsed ? item.label : undefined}
                      >
                        {!collapsed ? (
                          <span
                            className={cn(
                              "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full",
                              active ? "bg-sidebar-primary opacity-100" : "opacity-0",
                            )}
                          />
                        ) : null}
                        <Icon
                          className={cn(
                            "h-5 w-5 shrink-0",
                            active
                              ? "text-sidebar-primary"
                              : "text-sidebar-foreground/58 group-hover:text-sidebar-accent-foreground",
                          )}
                        />

                        {!collapsed ? (
                          <>
                            <span className="min-w-0 flex-1 truncate font-medium">
                              {item.label}
                            </span>
                            {item.badge ? (
                              <span
                                className={cn(
                                  "shrink-0 text-[11px] font-medium",
                                  active
                                    ? "text-sidebar-foreground/70"
                                    : "text-sidebar-foreground/50",
                                )}
                              >
                                {item.badge}
                              </span>
                            ) : null}
                          </>
                        ) : null}
                      </Link>
                    );
                  })()
                : null
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
