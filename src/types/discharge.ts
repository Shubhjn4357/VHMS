import type { DischargeSummaryStatus } from "@/constants/dischargeSummaryStatus";
import type { ClinicalAdmissionLookup } from "@/types/clinical";

export type DischargeSummaryRecord = {
  id: string;
  admissionId: string;
  patientId: string;
  patientName: string;
  patientHospitalNumber: string;
  doctorName: string | null;
  bedLabel: string | null;
  admittedAt: string;
  dischargedAt: string | null;
  admissionStatus: string;
  status: DischargeSummaryStatus;
  diagnosis: string;
  hospitalCourse: string;
  procedures: string | null;
  dischargeMedication: string | null;
  dischargeAdvice: string;
  followUpInstructions: string;
  versionCount: number;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DischargeFilters = {
  q?: string;
  status?: DischargeSummaryStatus | "ALL";
};

export type DischargeWorkspaceSummary = {
  total: number;
  drafts: number;
  finalized: number;
  readyToFinalize: number;
  admissionsWithoutSummary: number;
};

export type DischargeWorkspaceResponse = {
  entries: DischargeSummaryRecord[];
  admissions: ClinicalAdmissionLookup[];
  summary: DischargeWorkspaceSummary;
  filters: {
    q: string;
    status: DischargeSummaryStatus | "ALL";
  };
};

export type DischargeUpsertInput = {
  admissionId: string;
  diagnosis: string;
  hospitalCourse: string;
  procedures?: string;
  dischargeMedication?: string;
  dischargeAdvice: string;
  followUpInstructions: string;
};

export type DischargeUpdateInput = Partial<DischargeUpsertInput> & {
  id: string;
};

export type DischargeFinalizeInput = {
  id: string;
};
