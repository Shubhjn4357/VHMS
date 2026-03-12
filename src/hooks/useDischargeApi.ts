"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import type {
  DischargeFilters,
  DischargeFinalizeInput,
  DischargeSummaryRecord,
  DischargeUpdateInput,
  DischargeUpsertInput,
  DischargeWorkspaceResponse,
} from "@/types/discharge";

function buildDischargeUrl(filters: DischargeFilters) {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.status && filters.status !== "ALL") {
    params.set("status", filters.status);
  }

  const query = params.toString();
  return query
    ? `/api/discharge-summaries?${query}`
    : "/api/discharge-summaries";
}

async function invalidateDischarge(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await queryClient.invalidateQueries({ queryKey: ["discharge"] });
}

export function useDischargeWorkspace(filters: DischargeFilters = {}) {
  return useApiQuery<DischargeWorkspaceResponse>(
    ["discharge", filters.q ?? "", filters.status ?? "ALL"],
    buildDischargeUrl(filters),
  );
}

export function useCreateDischargeSummary() {
  const queryClient = useQueryClient();

  return useApiMutation<DischargeUpsertInput, DischargeSummaryRecord>(
    {
      method: "post",
      url: "/api/discharge-summaries",
    },
    {
      onSuccess: async () => {
        toast.success("Discharge summary draft created.");
        await invalidateDischarge(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useUpdateDischargeSummary() {
  const queryClient = useQueryClient();

  return useApiMutation<DischargeUpdateInput, DischargeSummaryRecord>(
    {
      method: "patch",
      url: (input) => `/api/discharge-summaries/${input.id}`,
      transform: (input) => ({
        diagnosis: input.diagnosis,
        hospitalCourse: input.hospitalCourse,
        procedures: input.procedures,
        dischargeMedication: input.dischargeMedication,
        dischargeAdvice: input.dischargeAdvice,
        followUpInstructions: input.followUpInstructions,
      }),
    },
    {
      onSuccess: async () => {
        toast.success("Discharge summary updated.");
        await invalidateDischarge(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useFinalizeDischargeSummary() {
  const queryClient = useQueryClient();

  return useApiMutation<DischargeFinalizeInput, DischargeSummaryRecord>(
    {
      method: "patch",
      url: (input) => `/api/discharge-summaries/${input.id}`,
      transform: () => ({
        action: "FINALIZE",
      }),
    },
    {
      onSuccess: async () => {
        toast.success("Discharge summary finalized.");
        await invalidateDischarge(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}
