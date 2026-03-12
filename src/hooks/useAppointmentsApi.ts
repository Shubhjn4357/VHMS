"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import type {
  AppointmentDeleteResponse,
  AppointmentFilters,
  AppointmentListResponse,
  AppointmentRecord,
  AppointmentUpdateInput,
  AppointmentUpsertInput,
} from "@/types/appointment";

function buildAppointmentsUrl(filters: AppointmentFilters) {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.status && filters.status !== "ALL") {
    params.set("status", filters.status);
  }

  const query = params.toString();
  return query ? `/api/appointments?${query}` : "/api/appointments";
}

async function invalidateAppointments(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await queryClient.invalidateQueries({ queryKey: ["appointments"] });
}

export function useAppointmentDirectory(filters: AppointmentFilters = {}) {
  return useApiQuery<AppointmentListResponse>(
    ["appointments", filters.q ?? "", filters.status ?? "ALL"],
    buildAppointmentsUrl(filters),
  );
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useApiMutation<AppointmentUpsertInput, AppointmentRecord>(
    {
      method: "post",
      url: "/api/appointments",
    },
    {
      onSuccess: async () => {
        toast.success("Appointment scheduled.");
        await invalidateAppointments(queryClient);
        await queryClient.invalidateQueries({ queryKey: ["patients"] });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useApiMutation<AppointmentUpdateInput, AppointmentRecord>(
    {
      method: "patch",
      url: (input) => `/api/appointments/${input.id}`,
      transform: (input) => ({
        patientId: input.patientId,
        doctorId: input.doctorId,
        scheduledFor: input.scheduledFor,
        visitType: input.visitType,
        status: input.status,
        notes: input.notes,
      }),
    },
    {
      onSuccess: async (_, input) => {
        toast.success(
          input.status === "CHECKED_IN"
            ? "Appointment checked in."
            : "Appointment updated.",
        );
        await invalidateAppointments(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();

  return useApiMutation<{ id: string }, AppointmentDeleteResponse>(
    {
      method: "delete",
      url: (input) => `/api/appointments/${input.id}`,
      transform: () => undefined,
    },
    {
      onSuccess: async () => {
        toast.success("Appointment deleted.");
        await invalidateAppointments(queryClient);
        await queryClient.invalidateQueries({ queryKey: ["billing"] });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}
