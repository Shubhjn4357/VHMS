import type { PermissionKey } from "@/constants/permissions";

export type UploadAssetTarget =
  | "PATIENT_PHOTO"
  | "HOSPITAL_LOGO"
  | "DOCTOR_SIGNATURE"
  | "BLOG_COVER"
  | "CONSENT_ATTACHMENT"
  | "DISCHARGE_ATTACHMENT";

export type UploadAssetRecord = {
  id: string;
  target: UploadAssetTarget;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  publicUrl: string;
  createdByUserId: string | null;
  createdAt: string;
};

export type UploadAssetResponse = {
  asset: UploadAssetRecord;
};

export type UploadTargetRule = {
  allowedMimeTypes: string[];
  maxBytes: number;
  permissions: PermissionKey[];
  directory: string;
};
