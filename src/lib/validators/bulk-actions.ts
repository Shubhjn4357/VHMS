import { z } from "zod";

import { appointmentStatusSchema } from "@/lib/validators/appointments";
import { staffAccessStatusSchema } from "@/lib/validators/staff-access";
import { updateBedSchema } from "@/lib/validators/wards";

const bulkIdsSchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1).max(100),
});

export const bulkPatientDeleteSchema = bulkIdsSchema;

export const bulkAppointmentActionSchema = z.discriminatedUnion("action", [
  bulkIdsSchema.extend({
    action: z.literal("delete"),
  }),
  bulkIdsSchema.extend({
    action: z.literal("status"),
    status: appointmentStatusSchema,
  }),
]);

export const bulkDoctorActionSchema = z.discriminatedUnion("action", [
  bulkIdsSchema.extend({
    action: z.literal("delete"),
  }),
  bulkIdsSchema.extend({
    action: z.literal("active"),
    active: z.boolean(),
  }),
]);

export const bulkStaffAccessActionSchema = z.discriminatedUnion("action", [
  bulkIdsSchema.extend({
    action: z.literal("delete"),
  }),
  bulkIdsSchema.extend({
    action: z.literal("status"),
    status: staffAccessStatusSchema,
  }),
]);

const nonOccupiedBedStatusSchema = updateBedSchema.shape.status.unwrap();

export const bulkWardActionSchema = z.discriminatedUnion("action", [
  bulkIdsSchema.extend({
    action: z.literal("delete"),
    entity: z.enum(["ward", "room", "bed"]),
  }),
  bulkIdsSchema.extend({
    action: z.literal("bedStatus"),
    entity: z.literal("bed"),
    status: nonOccupiedBedStatusSchema,
  }),
]);
