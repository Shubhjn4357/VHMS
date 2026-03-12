import type { UploadAssetTarget, UploadTargetRule } from "@/types/upload";

export const UPLOAD_TARGET_RULES: Record<UploadAssetTarget, UploadTargetRule> = {
  PATIENT_PHOTO: {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxBytes: 5 * 1024 * 1024,
    permissions: ["patients.create", "patients.update"],
    directory: "patients",
  },
  HOSPITAL_LOGO: {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxBytes: 5 * 1024 * 1024,
    permissions: ["settings.manage"],
    directory: "hospital",
  },
  DOCTOR_SIGNATURE: {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxBytes: 2 * 1024 * 1024,
    permissions: ["doctors.manage"],
    directory: "doctors",
  },
  BLOG_COVER: {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxBytes: 6 * 1024 * 1024,
    permissions: ["blog.manage"],
    directory: "blog",
  },
  CONSENT_ATTACHMENT: {
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
    maxBytes: 8 * 1024 * 1024,
    permissions: ["consents.create", "consents.finalize"],
    directory: "consents",
  },
  DISCHARGE_ATTACHMENT: {
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
    maxBytes: 8 * 1024 * 1024,
    permissions: ["discharge.create"],
    directory: "discharge",
  },
};
