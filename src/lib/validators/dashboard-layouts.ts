import { z } from "zod";

import {
  DASHBOARD_LAYOUT_KEYS,
  DASHBOARD_OVERVIEW_WIDGETS,
} from "@/constants/dashboardLayouts";

const layoutKeySchema = z.enum(DASHBOARD_LAYOUT_KEYS);
const widgetKeySchema = z.enum(
  DASHBOARD_OVERVIEW_WIDGETS.map((widget) => widget.key) as [
    (typeof DASHBOARD_OVERVIEW_WIDGETS)[number]["key"],
    ...(typeof DASHBOARD_OVERVIEW_WIDGETS)[number]["key"][],
  ],
);

export const dashboardLayoutQuerySchema = z.object({
  layoutKey: layoutKeySchema.optional().default("dashboard.overview"),
});

export const updateDashboardLayoutSchema = z.object({
  layoutKey: layoutKeySchema,
  widgets: z.array(
    z.object({
      key: widgetKeySchema,
      displayOrder: z.number().int().min(0),
      visible: z.boolean(),
    }),
  ).min(1),
});
