import { z } from "zod";

import { ANNOUNCEMENT_STATUS } from "@/constants/announcementStatus";
import { ANNOUNCEMENT_TARGET_TYPE } from "@/constants/announcementTargetType";
import { COMMUNICATION_CHANNEL } from "@/constants/communicationChannel";
import { COMMUNICATION_STATUS } from "@/constants/communicationStatus";
import { NOTIFICATION_PRIORITY } from "@/constants/notificationPriority";

const dateTimeStringSchema = z
  .string()
  .trim()
  .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), {
    message: "Enter a valid date and time.",
  });

export const communicationChannelSchema = z.enum(COMMUNICATION_CHANNEL);
export const communicationStatusSchema = z.enum(COMMUNICATION_STATUS);
export const notificationPrioritySchema = z.enum(NOTIFICATION_PRIORITY);
export const announcementStatusSchema = z.enum(ANNOUNCEMENT_STATUS);
export const announcementTargetTypeSchema = z.enum(ANNOUNCEMENT_TARGET_TYPE);

export const communicationFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  status: z.union([communicationStatusSchema, z.literal("ALL")]).optional()
    .default("ALL"),
});

export const createCommunicationTemplateSchema = z.object({
  key: z.string().trim().min(2, "Template key is too short.").max(
    80,
    "Template key is too long.",
  ).regex(
    /^[a-z0-9._-]+$/,
    "Use lowercase letters, numbers, dots, hyphens, or underscores.",
  ),
  channel: communicationChannelSchema,
  title: z.string().trim().min(3, "Title is too short.").max(
    140,
    "Title is too long.",
  ),
  body: z.string().trim().min(10, "Body is too short.").max(
    4000,
    "Body is too long.",
  ),
  active: z.boolean().default(true),
});

export const updateCommunicationTemplateSchema =
  createCommunicationTemplateSchema.partial().refine(
    (value) => Object.values(value).some((entry) => entry !== undefined),
    {
      message: "Submit at least one field to update.",
    },
  );

export const sendCommunicationSchema = z.object({
  templateId: z.string().trim().min(1, "Select a communication template."),
  patientId: z.string().trim().optional().or(z.literal("")),
  destination: z.string().trim().min(3, "Destination is too short.").max(
    160,
    "Destination is too long.",
  ),
});

export const messageQueueActionSchema = z.object({
  action: z.enum(["MARK_SENT", "MARK_DELIVERED", "MARK_FAILED", "REQUEUE"]),
  errorMessage: z.string().trim().max(300, "Error message is too long.")
    .optional().or(z.literal("")),
});

export const notificationUpdateSchema = z.object({
  action: z.enum(["MARK_READ", "ACKNOWLEDGE"]),
});

export const announcementTargetSchema = z.object({
  targetType: announcementTargetTypeSchema,
  targetValue: z.string().trim().max(100, "Target value is too long.")
    .optional().or(z.literal("")),
}).superRefine((value, context) => {
  if (value.targetType !== "ALL" && !value.targetValue) {
    context.addIssue({
      code: "custom",
      message: "Target value is required for role and department targets.",
      path: ["targetValue"],
    });
  }
});

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(3, "Announcement title is too short.").max(
    160,
    "Announcement title is too long.",
  ),
  body: z.string().trim().min(12, "Announcement body is too short.").max(
    4000,
    "Announcement body is too long.",
  ),
  status: announcementStatusSchema,
  priority: notificationPrioritySchema,
  pinned: z.boolean().default(false),
  acknowledgementRequired: z.boolean().default(false),
  expiresAt: dateTimeStringSchema.optional().or(z.literal("")),
  targets: z.array(announcementTargetSchema).min(
    1,
    "Add at least one announcement target.",
  ),
});
