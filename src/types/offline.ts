import type { AppointmentUpsertInput } from "@/types/appointment";
import type { BillCreateInput } from "@/types/billing";
import type { ChargeRecord } from "@/types/charge";
import type { DoctorLookupRecord } from "@/types/doctor";
import type { PatientUpsertInput } from "@/types/patient";
import type { AppointmentRecord } from "@/types/appointment";
import type { PatientRecord } from "@/types/patient";

export const OFFLINE_DRAFT_KEYS = [
  "patientRegistration",
  "appointmentScheduling",
  "billComposer",
] as const;

export type OfflineDraftKey = (typeof OFFLINE_DRAFT_KEYS)[number];

export const OFFLINE_ACTION_TYPES = [
  "patients.create",
  "appointments.create",
  "bills.createDraft",
] as const;

export type OfflineActionType = (typeof OFFLINE_ACTION_TYPES)[number];

export type OfflineActionStatus =
  | "PENDING"
  | "SYNCING"
  | "FAILED"
  | "COMPLETED";

export type OfflineActionPayloadMap = {
  "patients.create": PatientUpsertInput;
  "appointments.create": AppointmentUpsertInput;
  "bills.createDraft": BillCreateInput;
};

export const OFFLINE_LOOKUP_KEYS = [
  "patients",
  "doctors",
  "appointments",
  "charges",
] as const;

export type OfflineLookupKey = (typeof OFFLINE_LOOKUP_KEYS)[number];

export type OfflineLookupMap = {
  patients: PatientRecord[];
  doctors: DoctorLookupRecord[];
  appointments: AppointmentRecord[];
  charges: ChargeRecord[];
};

export type OfflineQueueItem = {
  id: string;
  type: OfflineActionType;
  label: string;
  url: string;
  method: "POST";
  payload: OfflineActionPayloadMap[OfflineActionType];
  status: OfflineActionStatus;
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  lastError: string | null;
};

export type OfflineSyncItemResult = {
  id: string;
  status: "COMPLETED" | "FAILED";
  retryable: boolean;
  message: string | null;
};

export type OfflineSyncResponse = {
  results: OfflineSyncItemResult[];
  syncedAt: string;
};

export type OfflineDraftRecord<T = unknown> = {
  key: OfflineDraftKey;
  label: string;
  payload: T;
  updatedAt: string;
};
