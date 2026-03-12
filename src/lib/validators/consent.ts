import { z } from "zod";

import { CONSENT_SIGNATURE_MODES } from "@/constants/consentSignatureMode";
import { CONSENT_SIGNER_ROLES } from "@/constants/consentSignerRole";
import { CONSENT_STATUS } from "@/constants/consentStatus";

const slugSchema = z
  .string()
  .trim()
  .min(2, "Slug is too short.")
  .max(80, "Slug is too long.")
  .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only.");

export const consentStatusSchema = z.enum(CONSENT_STATUS);
export const consentSignerRoleSchema = z.enum(CONSENT_SIGNER_ROLES);
export const consentSignatureModeSchema = z.enum(CONSENT_SIGNATURE_MODES);

export const consentFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  status: z.union([consentStatusSchema, z.literal("ALL")]).optional().default(
    "ALL",
  ),
});

export const createConsentTemplateSchema = z.object({
  name: z.string().trim().min(3, "Template name is too short.").max(
    120,
    "Template name is too long.",
  ),
  slug: slugSchema,
  category: z.string().trim().min(2, "Category is too short.").max(
    80,
    "Category is too long.",
  ),
  body: z.string().trim().min(20, "Template body is too short.").max(
    8000,
    "Template body is too long.",
  ),
  requiresWitness: z.boolean().default(false),
  requiresDoctor: z.boolean().default(false),
  active: z.boolean().default(true),
});

export const updateConsentTemplateSchema = createConsentTemplateSchema.partial()
  .refine(
    (value) => Object.values(value).some((entry) => entry !== undefined),
    {
      message: "Submit at least one field to update.",
    },
  );

export const createConsentDocumentSchema = z.object({
  templateId: z.string().trim().min(1, "Select a consent template."),
  patientId: z.string().trim().min(1, "Select a patient."),
  admissionId: z.string().trim().optional().or(z.literal("")),
  procedureName: z.string().trim().max(140, "Procedure name is too long.")
    .optional().or(z.literal("")),
});

export const updateConsentDocumentStatusSchema = z.object({
  action: z.enum(["REQUEST_SIGNATURE", "DECLINE", "REVOKE"]),
});

export const createConsentSignatureSchema = z.object({
  signerRole: consentSignerRoleSchema,
  signerName: z.string().trim().min(2, "Signer name is too short.").max(
    120,
    "Signer name is too long.",
  ),
  mode: consentSignatureModeSchema,
  notes: z.string().trim().max(500, "Notes are too long.").optional().or(
    z.literal(""),
  ),
});
