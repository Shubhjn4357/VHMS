"use client";

import { useApiQuery } from "@/hooks/useApiQuery";
import type {
  AnalyticsSnapshotResponse,
  DashboardOverviewResponse,
} from "@/types/analytics";

export function useDashboardOverview() {
  return useApiQuery<DashboardOverviewResponse>(
    ["dashboard-overview"],
    "/api/dashboard/overview",
  );
}

export function useAnalyticsSnapshot() {
  return useApiQuery<AnalyticsSnapshotResponse>(
    ["analytics-snapshot"],
    "/api/analytics",
  );
}
