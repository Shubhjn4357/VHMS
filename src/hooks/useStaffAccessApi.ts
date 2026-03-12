"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import type {
  StaffAccessFilters,
  StaffAccessListResponse,
  StaffAccessRecord,
  StaffAccessUpdateInput,
  StaffAccessUpsertInput,
} from "@/types/staffAccess";

function buildStaffAccessUrl(filters: StaffAccessFilters) {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.status && filters.status !== "ALL") {
    params.set("status", filters.status);
  }

  const query = params.toString();
  return query ? `/api/staff-access?${query}` : "/api/staff-access";
}

async function invalidateStaffAccessDirectory(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await queryClient.invalidateQueries({ queryKey: ["staff-access"] });
}

export function useStaffAccessDirectory(filters: StaffAccessFilters = {}) {
  return useApiQuery<StaffAccessListResponse>(
    ["staff-access", filters.q ?? "", filters.status ?? "ALL"],
    buildStaffAccessUrl(filters),
  );
}

export function useCreateStaffAccess() {
  const queryClient = useQueryClient();

  return useApiMutation<StaffAccessUpsertInput, StaffAccessRecord>(
    {
      method: "post",
      url: "/api/staff-access",
    },
    {
      onSuccess: async () => {
        toast.success("Staff access created.");
        await invalidateStaffAccessDirectory(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useUpdateStaffAccess() {
  const queryClient = useQueryClient();

  return useApiMutation<StaffAccessUpdateInput, StaffAccessRecord>(
    {
      method: "patch",
      url: (input) => `/api/staff-access/${input.id}`,
      transform: (input) => ({
        displayName: input.displayName,
        role: input.role,
        status: input.status,
        defaultPermissions: input.defaultPermissions,
      }),
    },
    {
      onSuccess: async () => {
        toast.success("Staff access updated.");
        await invalidateStaffAccessDirectory(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useDeleteStaffAccess() {
  const queryClient = useQueryClient();

  return useApiMutation<{ id: string }, { id: string; success: boolean }>(
    {
      method: "delete",
      url: (input) => `/api/staff-access/${input.id}`,
      transform: () => undefined,
    },
    {
      onSuccess: async () => {
        toast.success("Staff access removed.");
        await invalidateStaffAccessDirectory(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}
