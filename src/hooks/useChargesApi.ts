"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import type {
  ChargeDeleteResponse,
  ChargeFilters,
  ChargeListResponse,
  ChargeRecord,
  ChargeUpdateInput,
  ChargeUpsertInput,
} from "@/types/charge";

function buildChargesUrl(filters: ChargeFilters) {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.category && filters.category !== "ALL") {
    params.set("category", filters.category);
  }

  if (filters.status && filters.status !== "ALL") {
    params.set("status", filters.status);
  }

  const query = params.toString();
  return query ? `/api/charges?${query}` : "/api/charges";
}

async function invalidateCharges(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await queryClient.invalidateQueries({ queryKey: ["charges"] });
}

export function useChargeDirectory(filters: ChargeFilters = {}) {
  return useApiQuery<ChargeListResponse>(
    [
      "charges",
      filters.q ?? "",
      filters.category ?? "ALL",
      filters.status ?? "ALL",
    ],
    buildChargesUrl(filters),
  );
}

export function useCreateCharge() {
  const queryClient = useQueryClient();

  return useApiMutation<ChargeUpsertInput, ChargeRecord>(
    {
      method: "post",
      url: "/api/charges",
    },
    {
      onSuccess: async () => {
        toast.success("Charge created.");
        await invalidateCharges(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useUpdateCharge() {
  const queryClient = useQueryClient();

  return useApiMutation<ChargeUpdateInput, ChargeRecord>(
    {
      method: "patch",
      url: (input) => `/api/charges/${input.id}`,
      transform: (input) => ({
        categoryKey: input.categoryKey,
        name: input.name,
        code: input.code,
        unitPrice: input.unitPrice,
        taxable: input.taxable,
        active: input.active,
      }),
    },
    {
      onSuccess: async () => {
        toast.success("Charge updated.");
        await invalidateCharges(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useDeleteCharge() {
  const queryClient = useQueryClient();

  return useApiMutation<{ id: string }, ChargeDeleteResponse>(
    {
      method: "delete",
      url: (input) => `/api/charges/${input.id}`,
      transform: () => undefined,
    },
    {
      onSuccess: async () => {
        toast.success("Charge deleted.");
        await invalidateCharges(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}
