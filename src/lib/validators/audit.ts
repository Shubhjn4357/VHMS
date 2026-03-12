import { z } from "zod";

export const auditLogFiltersSchema = z.object({
  q: z.string().trim().max(120).optional(),
  action: z.string().trim().max(120).optional(),
  entityType: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(60),
});
