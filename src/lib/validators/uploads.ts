import { z } from "zod";

import { UPLOAD_TARGET_RULES } from "@/constants/uploadTargets";

export const uploadTargetSchema = z.enum(
  Object.keys(UPLOAD_TARGET_RULES) as [
    keyof typeof UPLOAD_TARGET_RULES,
    ...(keyof typeof UPLOAD_TARGET_RULES)[],
  ],
);

export const uploadRequestSchema = z.object({
  target: uploadTargetSchema,
});
