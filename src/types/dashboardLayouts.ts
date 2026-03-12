import type {
  DashboardLayoutKey,
  DashboardLayoutWidgetKey,
} from "@/constants/dashboardLayouts";

export type DashboardLayoutWidgetRecord = {
  key: DashboardLayoutWidgetKey;
  label: string;
  description: string;
  displayOrder: number;
  defaultOrder: number;
  visible: boolean;
  gridSpan: "full" | "half";
};

export type DashboardLayoutRecord = {
  layoutKey: DashboardLayoutKey;
  widgets: DashboardLayoutWidgetRecord[];
  updatedAt: string | null;
  summary: {
    total: number;
    visible: number;
    hidden: number;
    customized: boolean;
  };
};

export type DashboardLayoutUpdateInput = {
  layoutKey: DashboardLayoutKey;
  widgets: Array<{
    key: DashboardLayoutWidgetKey;
    displayOrder: number;
    visible: boolean;
  }>;
};
