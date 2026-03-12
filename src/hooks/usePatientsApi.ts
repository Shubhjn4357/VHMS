"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import type {
  PatientDeleteResponse,
  PatientFilters,
  PatientListResponse,
  PatientRecord,
  PatientUpdateInput,
  PatientUpsertInput,
} from "@/types/patient";

function buildPatientsUrl(filters: PatientFilters) {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set("q", filters.q);
  }

  const query = params.toString();
  return query ? `/api/patients?${query}` : "/api/patients";
}

async function invalidatePatients(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await queryClient.invalidateQueries({ queryKey: ["patients"] });
}

export function usePatientDirectory(filters: PatientFilters = {}) {
  return useApiQuery<PatientListResponse>(
    ["patients", filters.q ?? ""],
    buildPatientsUrl(filters),
  );
}

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useApiMutation<PatientUpsertInput, PatientRecord>(
    {
      method: "post",
      url: "/api/patients",
    },
    {
      onSuccess: async () => {
        toast.success("Patient record created.");
        await invalidatePatients(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();

  return useApiMutation<PatientUpdateInput, PatientRecord>(
    {
      method: "patch",
      url: (input) => `/api/patients/${input.id}`,
      transform: (input) => ({
        firstName: input.firstName,
        lastName: input.lastName,
        gender: input.gender,
        dateOfBirth: input.dateOfBirth,
        phone: input.phone,
        alternatePhone: input.alternatePhone,
        email: input.email,
        address: input.address,
        city: input.city,
        state: input.state,
        emergencyContact: input.emergencyContact,
        bloodGroup: input.bloodGroup,
        photoUrl: input.photoUrl,
        notes: input.notes,
      }),
    },
    {
      onSuccess: async () => {
        toast.success("Patient record updated.");
        await invalidatePatients(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useDeletePatient() {
  const queryClient = useQueryClient();

  return useApiMutation<{ id: string }, PatientDeleteResponse>(
    {
      method: "delete",
      url: (input) => `/api/patients/${input.id}`,
      transform: () => undefined,
    },
    {
      onSuccess: async () => {
        toast.success("Patient record deleted.");
        await invalidatePatients(queryClient);
        await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}
