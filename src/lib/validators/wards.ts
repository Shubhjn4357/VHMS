import { z } from "zod";

import { BED_STATUS } from "@/constants/bedStatus";

const trimmedString = (max: number) =>
  z.string().trim().min(1, "This field is required.").max(max);

const optionalTrimmedString = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

const nonOccupiedBedStatuses = BED_STATUS.filter((status) =>
  status !== "OCCUPIED"
) as [Exclude<(typeof BED_STATUS)[number], "OCCUPIED">, ...Exclude<(typeof BED_STATUS)[number], "OCCUPIED">[]];

export const wardManagementFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  wardId: z.string().trim().optional(),
  status: z
    .union([z.enum(BED_STATUS), z.literal("ALL")])
    .optional()
    .default("ALL"),
});

export const createWardSchema = z.object({
  name: trimmedString(80),
  floor: optionalTrimmedString(40),
});

export const updateWardSchema = z
  .object({
    name: trimmedString(80).optional(),
    floor: optionalTrimmedString(40),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export const createRoomSchema = z.object({
  wardId: trimmedString(80),
  roomNumber: trimmedString(40),
  roomType: trimmedString(80),
  dailyCharge: z.coerce
    .number()
    .finite("Enter a valid room charge.")
    .min(0, "Daily charge cannot be negative."),
});

export const updateRoomSchema = z
  .object({
    wardId: trimmedString(80).optional(),
    roomNumber: trimmedString(40).optional(),
    roomType: trimmedString(80).optional(),
    dailyCharge: z.coerce
      .number()
      .finite("Enter a valid room charge.")
      .min(0, "Daily charge cannot be negative.")
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export const createBedSchema = z.object({
  wardId: trimmedString(80),
  roomId: trimmedString(80),
  bedNumber: trimmedString(40),
  status: z.enum(nonOccupiedBedStatuses),
});

export const updateBedSchema = z
  .object({
    wardId: trimmedString(80).optional(),
    roomId: trimmedString(80).optional(),
    bedNumber: trimmedString(40).optional(),
    status: z.enum(nonOccupiedBedStatuses).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });
