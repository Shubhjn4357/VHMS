import { z } from "zod";

import { APPOINTMENT_STATUS } from "@/constants/appointmentStatus";
import { APPOINTMENT_VISIT_TYPES } from "@/constants/appointmentVisitType";

const dateTimeStringSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Enter a valid appointment date and time.",
  });

export const appointmentStatusSchema = z.enum(APPOINTMENT_STATUS);

export const appointmentFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  status: z
    .union([appointmentStatusSchema, z.literal("ALL")])
    .optional()
    .default("ALL"),
});

export const createAppointmentSchema = z.object({
  patientId: z.string().trim().min(1, "Select a patient."),
  doctorId: z.string().trim().min(1, "Select a doctor."),
  scheduledFor: dateTimeStringSchema,
  visitType: z.enum(APPOINTMENT_VISIT_TYPES),
  status: appointmentStatusSchema,
  notes: z
    .string()
    .trim()
    .max(500, "Notes are too long.")
    .optional()
    .or(z.literal("")),
});

export const updateAppointmentSchema = z
  .object({
    patientId: z.string().trim().min(1).optional(),
    doctorId: z.string().trim().min(1).optional(),
    scheduledFor: dateTimeStringSchema.optional(),
    visitType: z.enum(APPOINTMENT_VISIT_TYPES).optional(),
    status: appointmentStatusSchema.optional(),
    notes: z
      .string()
      .trim()
      .max(500, "Notes are too long.")
      .optional()
      .or(z.literal("")),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });
