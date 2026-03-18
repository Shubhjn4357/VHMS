"use client";

import Link from "next/link";
import {
  Activity,
  BarChart3,
  BellRing,
  BedDouble,
  CalendarDays,
  FileSignature,
  FileText,
  LayoutDashboard,
  Megaphone,
  MessageSquareMore,
  PenSquare,
  Printer,
  Receipt,
  ScrollText,
  Settings2,
  Stethoscope,
  UserCog,
  Users,
  Warehouse,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

function getNavIcon(href?: string) {
  switch (href) {
    case "/dashboard":
      return LayoutDashboard;
    case "/dashboard/patients":
      return Users;
    case "/dashboard/opd":
      return CalendarDays;
    case "/dashboard/doctors":
      return Stethoscope;
    case "/dashboard/staff":
      return UserCog;
    case "/dashboard/appointments":
      return CalendarDays;
    case "/dashboard/billing":
      return Receipt;
    case "/dashboard/charge-master":
      return Receipt;
    case "/dashboard/rooms":
      return Warehouse;
    case "/dashboard/wards":
      return Warehouse;
    case "/dashboard/ipd":
      return BedDouble;
    case "/dashboard/occupancy":
      return BedDouble;
    case "/dashboard/discharge-summaries":
      return FileText;
    case "/dashboard/discharge":
      return FileText;
    case "/dashboard/consents":
      return FileSignature;
    case "/dashboard/staff-access":
      return UserCog;
    case "/dashboard/announcements":
      return Megaphone;
    case "/dashboard/notifications":
      return BellRing;
    case "/dashboard/communications":
      return MessageSquareMore;
    case "/dashboard/print-templates":
      return Printer;
    case "/dashboard/reports":
      return ScrollText;
    case "/dashboard/analytics":
      return BarChart3;
    case "/dashboard/audit-logs":
      return Activity;
    case "/dashboard/settings":
      return Settings2;
    case "/dashboard/profile":
      return UserCog;
    case "/dashboard/blog":
      return PenSquare;
    default:
      return LayoutDashboard;
  }
}

type DashboardNavigationProps = {
  navGroups: NavGroup[];
  pathname: string;
  permissions: PermissionKey[];
  collapsed?: boolean;
};

export function DashboardNavigation({
  navGroups,
  pathname,
  permissions,
  collapsed = false,
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
    <div className="space-y-5">
      {visibleGroups.map((group) => (
        <section className="space-y-2" key={group.title}>
          {!collapsed ? (
            <div className="flex items-center justify-between px-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-sidebar-foreground/50">
                {group.title}
              </p>
              <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-sidebar-foreground/40">
                {group.items.length}
              </span>
            </div>
          ) : null}

          <div className="space-y-1">
            {group.items.map((item) =>
              item.href
                ? (() => {
                    const Icon = getNavIcon(item.href);
                    const active = isActiveRoute(pathname, item.href);

                    return (
                      <Link
                        aria-label={item.label}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
                          collapsed && "mx-auto h-10 w-10 justify-center px-0",
                        )}
                        href={item.href}
                        key={item.label}
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon
                          className={cn(
                            "h-5 w-5 shrink-0",
                            active
                              ? "text-sidebar-accent-foreground"
                              : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground",
                          )}
                        />

                        {!collapsed ? (
                          <>
                            <span className="min-w-0 flex-1 truncate font-medium">
                              {item.label}
                            </span>
                            {item.badge ? (
                              <Badge
                                className={cn(
                                  active
                                    ? "border-transparent bg-sidebar text-sidebar-foreground"
                                    : "border-sidebar-border bg-transparent text-sidebar-foreground/70",
                                )}
                                variant="outline"
                              >
                                {item.badge}
                              </Badge>
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
