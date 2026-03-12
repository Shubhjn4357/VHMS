import { z } from "zod";

import { BILL_STATUS } from "@/constants/billStatus";

const amountSchema = z.coerce
  .number()
  .finite("Enter a valid amount.")
  .min(0, "Amount cannot be negative.");

export const billStatusSchema = z.enum(BILL_STATUS);

export const billFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  status: z.union([billStatusSchema, z.literal("ALL")]).optional().default(
    "ALL",
  ),
});

export const billLineItemSchema = z.object({
  chargeId: z.string().trim().optional().nullable(),
  description: z
    .string()
    .trim()
    .min(2, "Line item description is too short.")
    .max(160, "Line item description is too long."),
  quantity: z.coerce
    .number()
    .finite("Enter a valid quantity.")
    .positive("Quantity must be greater than zero."),
  unitPrice: amountSchema,
});

export const createBillSchema = z.object({
  appointmentId: z.string().trim().min(1, "Select an appointment."),
  discountAmount: amountSchema,
  taxAmount: amountSchema,
  items: z.array(billLineItemSchema).min(1, "Add at least one charge line."),
});

export const settleBillSchema = z.object({
  action: z.enum(["FINALIZE", "CANCEL"]),
  paymentReceived: amountSchema.optional().default(0),
});
