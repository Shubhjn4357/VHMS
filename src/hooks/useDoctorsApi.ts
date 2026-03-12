"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import type {
  DoctorDeleteResponse,
  DoctorLookupResponse,
  DoctorManagementInput,
  DoctorManagementRecord,
  DoctorManagementResponse,
  DoctorUpdateInput,
} from "@/types/doctor";

function buildDoctorsUrl(q?: string) {
  if (!q?.trim()) {
    return "/api/doctors";
  }

  const params = new URLSearchParams({ q });
  return `/api/doctors?${params.toString()}`;
}

function buildDoctorManagementUrl(filters: {
  q?: string;
  status?: "ALL" | "ACTIVE" | "INACTIVE";
}) {
  const params = new URLSearchParams({ scope: "management" });

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.status && filters.status !== "ALL") {
    params.set("status", filters.status);
  }

  return `/api/doctors?${params.toString()}`;
}

async function invalidateDoctors(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await queryClient.invalidateQueries({ queryKey: ["doctors"] });
  await queryClient.invalidateQueries({ queryKey: ["doctor-management"] });
  await queryClient.invalidateQueries({ queryKey: ["analytics"] });
  await queryClient.invalidateQueries({ queryKey: ["reports"] });
}

export function useDoctorLookup(q?: string) {
  return useApiQuery<DoctorLookupResponse>(
    ["doctors", q ?? ""],
    buildDoctorsUrl(q),
  );
}

export function useDoctorManagement(filters: {
  q?: string;
  status?: "ALL" | "ACTIVE" | "INACTIVE";
} = {}) {
  return useApiQuery<DoctorManagementResponse>(
    ["doctor-management", filters.q ?? "", filters.status ?? "ALL"],
    buildDoctorManagementUrl(filters),
  );
}

export function useCreateDoctor() {
  const queryClient = useQueryClient();

  return useApiMutation<DoctorManagementInput, DoctorManagementRecord>(
    {
      method: "post",
      url: "/api/doctors",
    },
    {
      onSuccess: async () => {
        toast.success("Doctor created.");
        await invalidateDoctors(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useUpdateDoctor() {
  const queryClient = useQueryClient();

  return useApiMutation<DoctorUpdateInput, DoctorManagementRecord>(
    {
      method: "patch",
      url: (input) => `/api/doctors/${input.id}`,
      transform: (input) => ({
        fullName: input.fullName,
        designation: input.designation,
        specialty: input.specialty,
        consultationFee: input.consultationFee,
        departmentName: input.departmentName,
        email: input.email,
        phone: input.phone,
        signatureUrl: input.signatureUrl,
        active: input.active,
      }),
    },
    {
      onSuccess: async () => {
        toast.success("Doctor updated.");
        await invalidateDoctors(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useDeleteDoctor() {
  const queryClient = useQueryClient();

  return useApiMutation<{ id: string }, DoctorDeleteResponse>(
    {
      method: "delete",
      url: (input) => `/api/doctors/${input.id}`,
      transform: () => undefined,
    },
    {
      onSuccess: async () => {
        toast.success("Doctor deleted.");
        await invalidateDoctors(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}
