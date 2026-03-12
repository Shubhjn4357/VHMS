"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { DashboardLayoutKey } from "@/constants/dashboardLayouts";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import type {
  DashboardLayoutRecord,
  DashboardLayoutUpdateInput,
} from "@/types/dashboardLayouts";

function getLayoutUrl(layoutKey: DashboardLayoutKey) {
  return `/api/dashboard/layouts?layoutKey=${encodeURIComponent(layoutKey)}`;
}

export function useDashboardLayout(layoutKey: DashboardLayoutKey) {
  return useApiQuery<DashboardLayoutRecord>(
    ["dashboard-layout", layoutKey],
    getLayoutUrl(layoutKey),
  );
}

export function useSaveDashboardLayout() {
  const queryClient = useQueryClient();

  return useApiMutation<DashboardLayoutUpdateInput, DashboardLayoutRecord>(
    {
      method: "patch",
      url: "/api/dashboard/layouts",
    },
    {
      onSuccess: async (data) => {
        toast.success("Dashboard layout saved.");
        await queryClient.invalidateQueries({
          queryKey: ["dashboard-layout", data.layoutKey],
        });
      },
      onError: (error) => toast.error(error.message),
    },
  );
}

export function useResetDashboardLayout() {
  const queryClient = useQueryClient();

  return useApiMutation<
    { layoutKey: DashboardLayoutKey },
    DashboardLayoutRecord
  >(
    {
      method: "delete",
      url: (input) => getLayoutUrl(input.layoutKey),
    },
    {
      onSuccess: async (data) => {
        toast.success("Dashboard layout reset.");
        await queryClient.invalidateQueries({
          queryKey: ["dashboard-layout", data.layoutKey],
        });
      },
      onError: (error) => toast.error(error.message),
    },
  );
}
