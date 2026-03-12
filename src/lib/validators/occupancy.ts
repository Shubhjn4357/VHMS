import { z } from "zod";

import { BED_STATUS } from "@/constants/bedStatus";

const dateTimeStringSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Enter a valid admission date and time.",
  });

export const bedStatusSchema = z.enum(BED_STATUS);

export const occupancyFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  wardId: z.string().trim().optional(),
  status: z
    .union([bedStatusSchema, z.literal("ALL")])
    .optional()
    .default("ALL"),
});

export const createOccupancyAssignmentSchema = z.object({
  patientId: z.string().trim().min(1, "Select a patient."),
  bedId: z.string().trim().min(1, "Select a bed."),
  attendingDoctorId: z.string().trim().min(1, "Select an attending doctor."),
  admittedAt: dateTimeStringSchema.optional().or(z.literal("")),
});

export const occupancyAdmissionActionSchema = z
  .object({
    action: z.enum(["TRANSFER", "DISCHARGE"]),
    targetBedId: z.string().trim().optional(),
  })
  .superRefine((value, context) => {
    if (value.action === "TRANSFER" && !value.targetBedId) {
      context.addIssue({
        code: "custom",
        message: "Select a target bed for transfer.",
        path: ["targetBedId"],
      });
    }
  });

export const updateBedStatusSchema = z.object({
  status: bedStatusSchema,
});
