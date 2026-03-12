import { z } from "zod";

import { BLOOD_GROUPS } from "@/constants/bloodGroups";
import { PATIENT_GENDERS } from "@/constants/patientGender";

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""));

const dateStringSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Enter a valid date.",
  });

export const patientFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
});

export const createPatientSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "First name is too short.")
    .max(80, "First name is too long."),
  lastName: optionalTrimmedString(80),
  gender: z.enum(PATIENT_GENDERS),
  dateOfBirth: dateStringSchema.optional().or(z.literal("")),
  phone: optionalTrimmedString(20),
  alternatePhone: optionalTrimmedString(20),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(120, "Email is too long.")
    .optional()
    .or(z.literal("")),
  address: optionalTrimmedString(240),
  city: optionalTrimmedString(80),
  state: optionalTrimmedString(80),
  emergencyContact: optionalTrimmedString(120),
  bloodGroup: z.enum(BLOOD_GROUPS).optional().or(z.literal("")),
  photoUrl: optionalTrimmedString(240),
  notes: optionalTrimmedString(500),
});

export const updatePatientSchema = z
  .object({
    firstName: createPatientSchema.shape.firstName.optional(),
    lastName: optionalTrimmedString(80),
    gender: z.enum(PATIENT_GENDERS).optional(),
    dateOfBirth: dateStringSchema.optional().or(z.literal("")),
    phone: optionalTrimmedString(20),
    alternatePhone: optionalTrimmedString(20),
    email: createPatientSchema.shape.email,
    address: optionalTrimmedString(240),
    city: optionalTrimmedString(80),
    state: optionalTrimmedString(80),
    emergencyContact: optionalTrimmedString(120),
    bloodGroup: z.enum(BLOOD_GROUPS).optional().or(z.literal("")),
    photoUrl: optionalTrimmedString(240),
    notes: optionalTrimmedString(500),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });
