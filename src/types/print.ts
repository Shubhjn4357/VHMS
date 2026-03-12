import type { BillRecord } from "@/types/billing";
import type { ConsentDocumentRecord } from "@/types/consent";
import type { DischargeSummaryRecord } from "@/types/discharge";
import type { PrintTemplateRecord } from "@/types/printTemplates";

export type HospitalBrandingRecord = {
  legalName: string;
  displayName: string;
  registrationNumber: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  logoUrl: string | null;
  letterheadFooter: string | null;
};

export type BillPrintPayload = {
  branding: HospitalBrandingRecord;
  bill: BillRecord;
  template: PrintTemplateRecord;
};

export type DischargePrintPayload = {
  branding: HospitalBrandingRecord;
  summary: DischargeSummaryRecord;
  template: PrintTemplateRecord;
};

export type ConsentPrintPayload = {
  branding: HospitalBrandingRecord;
  document: ConsentDocumentRecord;
  template: PrintTemplateRecord;
};
