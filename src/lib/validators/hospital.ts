import { z } from "zod";

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "Value is too long.")
    .optional()
    .or(z.literal(""));

export const updateHospitalProfileSchema = z.object({
  legalName: z
    .string()
    .trim()
    .min(3, "Legal name is too short.")
    .max(160, "Legal name is too long."),
  displayName: z
    .string()
    .trim()
    .min(2, "Display name is too short.")
    .max(120, "Display name is too long."),
  registrationNumber: optionalTrimmedString(80),
  contactEmail: z
    .string()
    .trim()
    .email("Enter a valid email.")
    .max(160, "Email is too long.")
    .optional()
    .or(z.literal("")),
  contactPhone: optionalTrimmedString(32),
  address: optionalTrimmedString(240),
  logoUrl: optionalTrimmedString(240),
  letterheadFooter: optionalTrimmedString(320),
});
