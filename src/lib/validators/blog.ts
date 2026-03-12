import { z } from "zod";

import { BLOG_STATUS } from "@/constants/blogStatus";

const trimmedText = (minimum: number, message: string) =>
  z.string().trim().min(minimum, message);

export const blogStatusSchema = z.enum(BLOG_STATUS);

export const blogFiltersSchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  status: z
    .union([blogStatusSchema, z.literal("ALL")])
    .optional()
    .default("ALL"),
});

export const createBlogPostSchema = z.object({
  title: trimmedText(4, "Title is too short.").max(140, "Title is too long."),
  slug: z.string().trim().max(160, "Slug is too long.").default(""),
  categoryId: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || null),
  status: blogStatusSchema,
  excerpt: z
    .string()
    .trim()
    .max(280, "Excerpt is too long.")
    .default(""),
  coverImageUrl: z
    .string()
    .trim()
    .max(240, "Cover image URL is too long.")
    .default(""),
  seoTitle: z
    .string()
    .trim()
    .max(160, "SEO title is too long.")
    .default(""),
  seoDescription: z
    .string()
    .trim()
    .max(280, "SEO description is too long.")
    .default(""),
  body: trimmedText(24, "Body is too short.").max(20_000, "Body is too long."),
});

export const updateBlogPostSchema = z
  .object({
    title: z.string().trim().min(4).max(140).optional(),
    slug: z.string().trim().max(160).optional(),
    categoryId: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || null),
    status: blogStatusSchema.optional(),
    excerpt: z.string().trim().max(280).optional(),
    coverImageUrl: z.string().trim().max(240).optional(),
    seoTitle: z.string().trim().max(160).optional(),
    seoDescription: z.string().trim().max(280).optional(),
    body: z.string().trim().min(24).max(20_000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });
