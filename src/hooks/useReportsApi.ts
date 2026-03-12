"use client";

import { useApiQuery } from "@/hooks/useApiQuery";
import type { ReportsWorkspaceResponse } from "@/types/analytics";

export function useReportsWorkspace() {
  return useApiQuery<ReportsWorkspaceResponse>(
    ["reports-workspace"],
    "/api/reports",
  );
}
