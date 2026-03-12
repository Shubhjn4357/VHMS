import { z } from "zod";

import {
  PRINT_TEMPLATE_KEYS,
  PRINT_TEMPLATE_SECTION_KEYS,
} from "@/constants/printConfig";

const templateKeySchema = z.enum(PRINT_TEMPLATE_KEYS as [string, ...string[]]);
const sectionKeySchema = z.enum(
  PRINT_TEMPLATE_SECTION_KEYS as [string, ...string[]],
);

export const printTemplateQuerySchema = z.object({
  templateKey: templateKeySchema.optional(),
});

export const updatePrintTemplateSchema = z.object({
  templateKey: templateKeySchema,
  sections: z.array(
    z.object({
      key: sectionKeySchema,
      displayOrder: z.number().int().min(0),
    }),
  ).min(1),
});
