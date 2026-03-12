import { z } from "zod";

import { DISCHARGE_SUMMARY_STATUS } from "@/constants/dischargeSummaryStatus";

const sectionSchema = z
  .string()
  .trim()
  .min(8, "This section is too short.")
  .max(4000, "This section is too long.");

const optionalSectionSchema = z
  .string()
  .trim()
  .max(4000, "This section is too long.")
  .optional()
  .or(z.literal(""));

export const dischargeSummaryStatusSchema = z.enum(DISCHARGE_SUMMARY_STATUS);

export const dischargeFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  status: z.union([dischargeSummaryStatusSchema, z.literal("ALL")]).optional()
    .default("ALL"),
});

export const createDischargeSummarySchema = z.object({
  admissionId: z.string().trim().min(1, "Select an admission."),
  diagnosis: sectionSchema,
  hospitalCourse: sectionSchema,
  procedures: optionalSectionSchema,
  dischargeMedication: optionalSectionSchema,
  dischargeAdvice: sectionSchema,
  followUpInstructions: sectionSchema,
});

export const updateDischargeSummarySchema = createDischargeSummarySchema
  .omit({ admissionId: true })
  .partial()
  .refine(
    (value) => Object.values(value).some((entry) => entry !== undefined),
    {
      message: "Submit at least one field to update.",
    },
  );

export const finalizeDischargeSummarySchema = z.object({
  action: z.literal("FINALIZE"),
});
