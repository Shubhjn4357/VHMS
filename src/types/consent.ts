import type { ConsentSignatureMode } from "@/constants/consentSignatureMode";
import type { ConsentSignerRole } from "@/constants/consentSignerRole";
import type { ConsentStatus } from "@/constants/consentStatus";
import type { ClinicalAdmissionLookup } from "@/types/clinical";

export type ConsentTemplateRecord = {
  id: string;
  name: string;
  slug: string;
  category: string;
  body: string;
  requiresWitness: boolean;
  requiresDoctor: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ConsentSignatureRecord = {
  id: string;
  signerRole: ConsentSignerRole;
  signerName: string;
  mode: ConsentSignatureMode;
  notes: string | null;
  signedAt: string;
};

export type ConsentDocumentRecord = {
  id: string;
  templateId: string;
  templateName: string;
  patientId: string;
  patientName: string;
  patientHospitalNumber: string;
  admissionId: string | null;
  procedureName: string | null;
  status: ConsentStatus;
  renderedBody: string;
  requiresWitness: boolean;
  requiresDoctor: boolean;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
  signatures: ConsentSignatureRecord[];
};

export type ConsentTemplateFilters = {
  q?: string;
};

export type ConsentDocumentFilters = {
  q?: string;
  status?: ConsentStatus | "ALL";
};

export type ConsentFilters = ConsentDocumentFilters;

export type ConsentWorkspaceSummary = {
  templates: number;
  activeTemplates: number;
  documents: number;
  draftDocuments: number;
  pendingSignatureDocuments: number;
  signedDocuments: number;
};

export type ConsentWorkspaceResponse = {
  templates: ConsentTemplateRecord[];
  documents: ConsentDocumentRecord[];
  admissions: ClinicalAdmissionLookup[];
  summary: ConsentWorkspaceSummary;
  filters: {
    q: string;
    status: ConsentStatus | "ALL";
  };
};

export type ConsentTemplateUpsertInput = {
  name: string;
  slug: string;
  category: string;
  body: string;
  requiresWitness: boolean;
  requiresDoctor: boolean;
  active: boolean;
};

export type ConsentTemplateUpdateInput = Partial<ConsentTemplateUpsertInput> & {
  id: string;
};

export type ConsentDocumentCreateInput = {
  templateId: string;
  patientId: string;
  admissionId?: string;
  procedureName?: string;
};

export type ConsentDocumentStatusUpdateInput = {
  id: string;
  action: "REQUEST_SIGNATURE" | "DECLINE" | "REVOKE";
};

export type ConsentSignatureCreateInput = {
  consentDocumentId: string;
  signerRole: ConsentSignerRole;
  signerName: string;
  mode: ConsentSignatureMode;
  notes?: string;
};
