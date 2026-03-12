import type { BloodGroup } from "@/constants/bloodGroups";
import type { PatientGender } from "@/constants/patientGender";

export type PatientRecord = {
  id: string;
  hospitalNumber: string;
  firstName: string;
  lastName: string | null;
  fullName: string;
  gender: PatientGender;
  dateOfBirth: string | null;
  ageLabel: string | null;
  phone: string | null;
  alternatePhone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  emergencyContact: string | null;
  bloodGroup: BloodGroup | null;
  photoUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PatientFilters = {
  q?: string;
};

export type PatientSummary = {
  total: number;
  addedThisWeek: number;
  withPrimaryPhone: number;
  missingCriticalProfile: number;
};

export type PatientListResponse = {
  entries: PatientRecord[];
  summary: PatientSummary;
  filters: {
    q: string;
  };
};

export type PatientUpsertInput = {
  firstName: string;
  lastName?: string;
  gender: PatientGender;
  dateOfBirth?: string;
  phone?: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  emergencyContact?: string;
  bloodGroup?: BloodGroup | "";
  photoUrl?: string;
  notes?: string;
};

export type PatientUpdateInput = Partial<PatientUpsertInput> & {
  id: string;
};

export type PatientDeleteResponse = {
  id: string;
  deleted: true;
};
