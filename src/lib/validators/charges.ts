import { z } from "zod";

import { CHARGE_CATEGORIES } from "@/constants/chargeCategories";

const priceSchema = z.coerce
  .number()
  .finite("Enter a valid amount.")
  .min(0, "Amount cannot be negative.");

export const chargeFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  category: z
    .union([z.enum(CHARGE_CATEGORIES), z.literal("ALL")])
    .optional()
    .default("ALL"),
  status: z
    .union([z.literal("ALL"), z.literal("ACTIVE"), z.literal("INACTIVE")])
    .optional()
    .default("ALL"),
});

export const createChargeSchema = z.object({
  categoryKey: z.enum(CHARGE_CATEGORIES),
  name: z
    .string()
    .trim()
    .min(2, "Charge name is too short.")
    .max(120, "Charge name is too long."),
  code: z
    .string()
    .trim()
    .min(3, "Charge code is too short.")
    .max(40, "Charge code is too long.")
    .regex(/^[A-Z0-9-]+$/, "Use uppercase letters, numbers, and hyphens only."),
  unitPrice: priceSchema,
  taxable: z.boolean(),
  active: z.boolean(),
});

export const updateChargeSchema = z
  .object({
    categoryKey: z.enum(CHARGE_CATEGORIES).optional(),
    name: createChargeSchema.shape.name.optional(),
    code: createChargeSchema.shape.code.optional(),
    unitPrice: priceSchema.optional(),
    taxable: z.boolean().optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });
