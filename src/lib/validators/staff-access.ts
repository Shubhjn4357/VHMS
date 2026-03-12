import { z } from "zod";

import { ALL_PERMISSIONS } from "@/constants/permissions";
import { APP_ROLES } from "@/constants/roles";
import { STAFF_ACCESS_STATUS } from "@/constants/staffAccessDefaults";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid staff email address.")
  .max(120, "Email is too long.");

const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Display name is too short.")
  .max(80, "Display name is too long.");

const permissionListSchema = z
  .array(z.enum(ALL_PERMISSIONS))
  .min(1, "Select at least one permission.")
  .transform((permissions) => [...new Set(permissions)]);

export const staffAccessStatusSchema = z.enum(STAFF_ACCESS_STATUS);

export const staffAccessFiltersSchema = z.object({
  q: z.string().trim().max(80).optional().default(""),
  status: z
    .union([staffAccessStatusSchema, z.literal("ALL")])
    .optional()
    .default("ALL"),
});

export const createStaffAccessSchema = z.object({
  email: emailSchema,
  displayName: displayNameSchema,
  role: z.enum(APP_ROLES),
  status: staffAccessStatusSchema,
  defaultPermissions: permissionListSchema,
});

export const updateStaffAccessSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    role: z.enum(APP_ROLES).optional(),
    status: staffAccessStatusSchema.optional(),
    defaultPermissions: permissionListSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });
