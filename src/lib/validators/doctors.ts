import { z } from "zod";

const optionalTrimmedString = z
  .string()
  .trim()
  .max(120, "Value is too long.")
  .optional()
  .or(z.literal(""));

export const createDoctorSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Doctor name is too short.")
    .max(120, "Doctor name is too long."),
  designation: optionalTrimmedString,
  specialty: optionalTrimmedString,
  consultationFee: z.coerce
    .number()
    .finite("Enter a valid fee.")
    .min(0, "Fee cannot be negative."),
  departmentName: optionalTrimmedString,
  email: z
    .string()
    .trim()
    .email("Enter a valid email.")
    .max(160, "Email is too long.")
    .optional()
    .or(z.literal("")),
  phone: optionalTrimmedString,
  signatureUrl: z
    .string()
    .trim()
    .max(240, "Signature URL is too long.")
    .optional()
    .or(z.literal("")),
  active: z.boolean(),
});

export const updateDoctorSchema = z
  .object({
    fullName: createDoctorSchema.shape.fullName.optional(),
    designation: optionalTrimmedString,
    specialty: optionalTrimmedString,
    consultationFee: createDoctorSchema.shape.consultationFee.optional(),
    departmentName: optionalTrimmedString,
    email: createDoctorSchema.shape.email,
    phone: optionalTrimmedString,
    signatureUrl: createDoctorSchema.shape.signatureUrl,
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export const doctorManagementFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  status: z
    .union([z.literal("ALL"), z.literal("ACTIVE"), z.literal("INACTIVE")])
    .optional()
    .default("ALL"),
});
