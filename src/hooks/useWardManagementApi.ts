"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import type {
  BedUpdateInput,
  BedUpsertInput,
  RoomUpdateInput,
  RoomUpsertInput,
  WardManagementDeleteResponse,
  WardManagementFilters,
  WardManagementResponse,
  WardManagementBedRecord,
  WardManagementRoomRecord,
  WardManagementWardRecord,
  WardUpdateInput,
  WardUpsertInput,
} from "@/types/wardManagement";

function buildWardManagementUrl(filters: WardManagementFilters) {
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
  return query ? `/api/wards?${query}` : "/api/wards";
}

async function invalidateWardManagement(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await queryClient.invalidateQueries({ queryKey: ["ward-management"] });
  await queryClient.invalidateQueries({ queryKey: ["occupancy"] });
}

export function useWardManagementDirectory(
  filters: WardManagementFilters = {},
) {
  return useApiQuery<WardManagementResponse>(
    [
      "ward-management",
      filters.q ?? "",
      filters.wardId ?? "",
      filters.status ?? "ALL",
    ],
    buildWardManagementUrl(filters),
  );
}

export function useCreateWard() {
  const queryClient = useQueryClient();

  return useApiMutation<WardUpsertInput, WardManagementWardRecord>(
    {
      method: "post",
      url: "/api/wards",
    },
    {
      onSuccess: async () => {
        toast.success("Ward created.");
        await invalidateWardManagement(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useUpdateWard() {
  const queryClient = useQueryClient();

  return useApiMutation<WardUpdateInput, WardManagementWardRecord>(
    {
      method: "patch",
      url: (input) => `/api/wards/${input.id}`,
      transform: (input) => ({
        name: input.name,
        floor: input.floor,
      }),
    },
    {
      onSuccess: async () => {
        toast.success("Ward updated.");
        await invalidateWardManagement(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useDeleteWard() {
  const queryClient = useQueryClient();

  return useApiMutation<{ id: string }, WardManagementDeleteResponse>(
    {
      method: "delete",
      url: (input) => `/api/wards/${input.id}`,
      transform: () => undefined,
    },
    {
      onSuccess: async () => {
        toast.success("Ward deleted.");
        await invalidateWardManagement(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useCreateRoom() {
  const queryClient = useQueryClient();

  return useApiMutation<RoomUpsertInput, WardManagementRoomRecord>(
    {
      method: "post",
      url: "/api/rooms",
    },
    {
      onSuccess: async () => {
        toast.success("Room created.");
        await invalidateWardManagement(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();

  return useApiMutation<RoomUpdateInput, WardManagementRoomRecord>(
    {
      method: "patch",
      url: (input) => `/api/rooms/${input.id}`,
      transform: (input) => ({
        wardId: input.wardId,
        roomNumber: input.roomNumber,
        roomType: input.roomType,
        dailyCharge: input.dailyCharge,
      }),
    },
    {
      onSuccess: async () => {
        toast.success("Room updated.");
        await invalidateWardManagement(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();

  return useApiMutation<{ id: string }, WardManagementDeleteResponse>(
    {
      method: "delete",
      url: (input) => `/api/rooms/${input.id}`,
      transform: () => undefined,
    },
    {
      onSuccess: async () => {
        toast.success("Room deleted.");
        await invalidateWardManagement(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useCreateBed() {
  const queryClient = useQueryClient();

  return useApiMutation<BedUpsertInput, WardManagementBedRecord>(
    {
      method: "post",
      url: "/api/beds",
    },
    {
      onSuccess: async () => {
        toast.success("Bed created.");
        await invalidateWardManagement(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useUpdateBed() {
  const queryClient = useQueryClient();

  return useApiMutation<BedUpdateInput, WardManagementBedRecord>(
    {
      method: "patch",
      url: (input) => `/api/beds/${input.id}`,
      transform: (input) => ({
        wardId: input.wardId,
        roomId: input.roomId,
        bedNumber: input.bedNumber,
        status: input.status,
      }),
    },
    {
      onSuccess: async () => {
        toast.success("Bed updated.");
        await invalidateWardManagement(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useDeleteBed() {
  const queryClient = useQueryClient();

  return useApiMutation<{ id: string }, WardManagementDeleteResponse>(
    {
      method: "delete",
      url: (input) => `/api/beds/${input.id}`,
      transform: () => undefined,
    },
    {
      onSuccess: async () => {
        toast.success("Bed deleted.");
        await invalidateWardManagement(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}
