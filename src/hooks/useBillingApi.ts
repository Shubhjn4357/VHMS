"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import type {
  BillCreateInput,
  BillFilters,
  BillListResponse,
  BillRecord,
  BillSettlementInput,
} from "@/types/billing";

function buildBillsUrl(filters: BillFilters) {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.status && filters.status !== "ALL") {
    params.set("status", filters.status);
  }

  const query = params.toString();
  return query ? `/api/bills?${query}` : "/api/bills";
}

async function invalidateBills(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({ queryKey: ["bills"] });
}

export function useBillingDirectory(filters: BillFilters = {}) {
  return useApiQuery<BillListResponse>(
    ["bills", filters.q ?? "", filters.status ?? "ALL"],
    buildBillsUrl(filters),
  );
}

export function useCreateBill() {
  const queryClient = useQueryClient();

  return useApiMutation<BillCreateInput, BillRecord>(
    {
      method: "post",
      url: "/api/bills",
    },
    {
      onSuccess: async () => {
        toast.success("Draft bill created.");
        await invalidateBills(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useSettleBill() {
  const queryClient = useQueryClient();

  return useApiMutation<BillSettlementInput, BillRecord>(
    {
      method: "patch",
      url: (input) => `/api/bills/${input.id}`,
      transform: (input) => ({
        action: input.action,
        paymentReceived: input.paymentReceived,
      }),
    },
    {
      onSuccess: async (_, input) => {
        toast.success(
          input.action === "CANCEL"
            ? "Bill cancelled."
            : "Bill settlement recorded.",
        );
        await invalidateBills(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}
