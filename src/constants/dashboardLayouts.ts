export const DASHBOARD_LAYOUT_KEYS = ["dashboard.overview"] as const;

export type DashboardLayoutKey = (typeof DASHBOARD_LAYOUT_KEYS)[number];

export const DASHBOARD_OVERVIEW_WIDGETS = [
  {
    key: "summary",
    label: "Summary band",
    description: "Collections, queue progress, occupancy, and approvals.",
    defaultOrder: 0,
    gridSpan: "full",
  },
  {
    key: "queue",
    label: "Front-desk queue",
    description: "Appointments moving through reception.",
    defaultOrder: 1,
    gridSpan: "half",
  },
  {
    key: "occupancy",
    label: "Occupancy signal",
    description: "Ward status with live capacity context.",
    defaultOrder: 2,
    gridSpan: "half",
  },
  {
    key: "communications",
    label: "Communication queue",
    description: "Delivery batches that still need review.",
    defaultOrder: 3,
    gridSpan: "half",
  },
  {
    key: "audit",
    label: "Audit and approvals",
    description: "Sensitive actions and unread operational signals.",
    defaultOrder: 4,
    gridSpan: "half",
  },
] as const;

export type DashboardOverviewWidgetKey =
  (typeof DASHBOARD_OVERVIEW_WIDGETS)[number]["key"];

export type DashboardLayoutWidgetKey = DashboardOverviewWidgetKey;

export function getDashboardLayoutDefinitions(layoutKey: DashboardLayoutKey) {
  if (layoutKey === "dashboard.overview") {
    return DASHBOARD_OVERVIEW_WIDGETS;
  }

  return DASHBOARD_OVERVIEW_WIDGETS;
}
