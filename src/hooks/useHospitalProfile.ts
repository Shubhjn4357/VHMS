"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import type {
  HospitalProfileRecord,
  HospitalProfileUpdateInput,
} from "@/types/hospital";

async function invalidateHospitalProfile(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await queryClient.invalidateQueries({ queryKey: ["hospital-profile"] });
}

export function useHospitalProfile() {
  return useApiQuery<HospitalProfileRecord>(
    ["hospital-profile"],
    "/api/hospital-profile",
  );
}

export function useUpdateHospitalProfile() {
  const queryClient = useQueryClient();

  return useApiMutation<HospitalProfileUpdateInput, HospitalProfileRecord>(
    {
      method: "patch",
      url: "/api/hospital-profile",
    },
    {
      onSuccess: async () => {
        toast.success("Hospital profile updated.");
        await invalidateHospitalProfile(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}
