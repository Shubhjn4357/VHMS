"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import type {
  OccupancyAssignmentInput,
  OccupancyBedRecord,
  OccupancyBedStatusUpdateInput,
  OccupancyBoardResponse,
  OccupancyFilters,
} from "@/types/occupancy";

type OccupancyTransferInput = {
  id: string;
  targetBedId: string;
};

type OccupancyDischargeInput = {
  id: string;
};

function buildOccupancyUrl(filters: OccupancyFilters) {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.wardId) {
    params.set("wardId", filters.wardId);
  }

  if (filters.status && filters.status !== "ALL") {
    params.set("status", filters.status);
  }

  const query = params.toString();
  return query ? `/api/occupancy?${query}` : "/api/occupancy";
}

async function invalidateOccupancy(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await queryClient.invalidateQueries({ queryKey: ["occupancy"] });
}

export function useOccupancyBoard(filters: OccupancyFilters = {}) {
  return useApiQuery<OccupancyBoardResponse>(
    [
      "occupancy",
      filters.q ?? "",
      filters.wardId ?? "",
      filters.status ?? "ALL",
    ],
    buildOccupancyUrl(filters),
  );
}

export function useAssignBed() {
  const queryClient = useQueryClient();

  return useApiMutation<OccupancyAssignmentInput, OccupancyBedRecord>(
    {
      method: "post",
      url: "/api/occupancy/admissions",
    },
    {
      onSuccess: async () => {
        toast.success("Patient admitted and bed assigned.");
        await invalidateOccupancy(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useTransferAdmission() {
  const queryClient = useQueryClient();

  return useApiMutation<OccupancyTransferInput, OccupancyBedRecord>(
    {
      method: "patch",
      url: (input) => `/api/occupancy/admissions/${input.id}`,
      transform: (input) => ({
        action: "TRANSFER",
        targetBedId: input.targetBedId,
      }),
    },
    {
      onSuccess: async () => {
        toast.success("Patient transferred to the new bed.");
        await invalidateOccupancy(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useDischargeAdmission() {
  const queryClient = useQueryClient();

  return useApiMutation<OccupancyDischargeInput, OccupancyBedRecord>(
    {
      method: "patch",
      url: (input) => `/api/occupancy/admissions/${input.id}`,
      transform: () => ({
        action: "DISCHARGE",
      }),
    },
    {
      onSuccess: async () => {
        toast.success("Patient discharged and bed moved to cleaning.");
        await invalidateOccupancy(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useUpdateBedStatus() {
  const queryClient = useQueryClient();

  return useApiMutation<OccupancyBedStatusUpdateInput, OccupancyBedRecord>(
    {
      method: "patch",
      url: (input) => `/api/occupancy/beds/${input.id}`,
      transform: (input) => ({
        status: input.status,
      }),
    },
    {
      onSuccess: async () => {
        toast.success("Bed status updated.");
        await invalidateOccupancy(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}
