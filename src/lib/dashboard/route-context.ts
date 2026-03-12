import type { PermissionKey } from "@/constants/permissions";
import type { NavGroup } from "@/lib/module-config";

type NavItem = NavGroup["items"][number];

type RouteOverride = {
  prefix: string;
  title: string;
  detail: string;
  sectionTitle?: string;
};

export type DashboardRouteContext = {
  sectionTitle: string;
  title: string;
  detail: string;
  href?: string;
  quickLinks: NavItem[];
};

const routeOverrides: RouteOverride[] = [
  {
    prefix: "/dashboard/patients/new",
    title: "Register patient",
    detail:
      "Capture a new patient identity, demographic profile, and reception-ready intake record.",
  },
  {
    prefix: "/dashboard/appointments/new",
    title: "Create appointment",
    detail:
      "Schedule a doctor slot, attach a patient thread, and prepare the OPD journey from one screen.",
  },
  {
    prefix: "/dashboard/billing/create",
    title: "Create invoice",
    detail:
      "Build draft OPD or hospital invoices against live patients, appointments, and charge items.",
  },
  {
    prefix: "/dashboard/billing/checkout",
    title: "Checkout desk",
    detail:
      "Finalize dues, collect payments, and close front-desk settlements without leaving the billing stream.",
  },
  {
    prefix: "/dashboard/print/bills",
    title: "Bill print output",
    detail:
      "Render invoice-safe A4 and thermal layouts with live billing data and print template rules.",
    sectionTitle: "Print",
  },
  {
    prefix: "/dashboard/print/consents",
    title: "Consent print output",
    detail:
      "Generate archive-safe consent documents from the signed clinical record and template order.",
    sectionTitle: "Print",
  },
  {
    prefix: "/dashboard/print/discharge",
    title: "Discharge print output",
    detail:
      "Produce finalized A4 discharge summaries with structured clinical notes and patient details.",
    sectionTitle: "Print",
  },
];

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

function byPrefixLengthDesc<T extends { prefix: string }>(items: T[]) {
  return [...items].sort((left, right) => right.prefix.length - left.prefix.length);
}

export function resolveDashboardRouteContext(
  pathname: string,
  navGroups: readonly NavGroup[],
  permissions: PermissionKey[],
): DashboardRouteContext {
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasAccess(permissions, item.permissions)),
    }))
    .filter((group) => group.items.length > 0);

  const flattenedItems = visibleGroups.flatMap((group) =>
    group.items
      .filter((item) => item.href)
      .map((item) => ({
        groupTitle: group.title,
        item,
      }))
  );

  const matchedItem = flattenedItems
    .sort((left, right) => right.item.href!.length - left.item.href!.length)
    .find(({ item }) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  const matchedOverride = byPrefixLengthDesc(routeOverrides).find((override) =>
    pathname === override.prefix || pathname.startsWith(`${override.prefix}/`)
  );

  const currentGroup = matchedItem
    ? visibleGroups.find((group) => group.title === matchedItem.groupTitle)
    : visibleGroups[0];

  const quickLinks = currentGroup?.items.filter((item) => item.href).slice(0, 8) ?? [];

  if (matchedOverride) {
    return {
      sectionTitle: matchedOverride.sectionTitle ?? matchedItem?.groupTitle ?? currentGroup?.title ?? "Dashboard",
      title: matchedOverride.title,
      detail: matchedOverride.detail,
      href: matchedItem?.item.href,
      quickLinks,
    };
  }

  if (matchedItem) {
    return {
      sectionTitle: matchedItem.groupTitle,
      title: matchedItem.item.label,
      detail:
        currentGroup?.title === "Operations"
          ? "Live operational modules for reception, billing, doctors, and room-linked intake control."
          : currentGroup?.title === "Clinical"
          ? "Real-time inpatient flow, occupancy, discharge, and consent workflows tied to the patient thread."
          : "Administrative controls for access, messaging, reports, analytics, and operational governance.",
      href: matchedItem.item.href,
      quickLinks,
    };
  }

  return {
    sectionTitle: "Dashboard",
    title: "Operations dashboard",
    detail:
      "Access-aware hospital operations shell for appointments, billing, occupancy, reporting, and staff control.",
    href: "/dashboard",
    quickLinks,
  };
}
