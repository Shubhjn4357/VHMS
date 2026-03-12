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
    <div className={cn("space-y-5", collapsed && "space-y-4")}>
      {visibleGroups.map((group) => (
        <section key={group.title}>
          {!collapsed
            ? (
              <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {group.title}
              </p>
            )
            : null}
          <div className={cn("mt-3 space-y-2", collapsed && "mt-0 space-y-1.5")}>
            {group.items.map((item) =>
              item.href
                ? (
                  (() => {
                    const Icon = getNavIcon(item.href);
                    const active = isActiveRoute(pathname, item.href);

                    return (
                      <Link
                        aria-label={item.label}
                        className={cn(
                          "glass-chip flex items-center gap-3 rounded-[18px] px-3 py-2.5 text-sm font-medium transition",
                          active
                            ? "border-primary/24 text-primary shadow-[var(--shadow-button)]"
                            : "text-foreground hover:-translate-y-0.5 hover:border-primary/18 hover:text-primary",
                          collapsed &&
                            "justify-center rounded-[16px] px-3 py-2.5",
                        )}
                        href={item.href}
                        key={item.label}
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!collapsed
                          ? (
                            <>
                              <span className="min-w-0 flex-1 truncate">
                                {item.label}
                              </span>
                              {item.badge
                                ? (
                                  <span
                                    className={cn(
                                      "rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                                      active
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-white/50 text-muted-foreground dark:bg-white/6",
                                    )}
                                  >
                                    {item.badge}
                                  </span>
                                )
                                : null}
                            </>
                          )
                          : null}
                      </Link>
                    );
                  })()
                )
                : null
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
