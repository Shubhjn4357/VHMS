import { z } from "zod";

export const globalSearchSchema = z.object({
  q: z.string().trim().min(1).max(120),
});

export const barcodeLookupSchema = z.object({
  code: z.string().trim().min(1).max(120),
});
