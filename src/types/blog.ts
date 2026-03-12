import type { BlogStatus } from "@/constants/blogStatus";

export type BlogCategoryRecord = {
  id: string;
  name: string;
  slug: string;
};

export type BlogPostRecord = {
  id: string;
  title: string;
  slug: string;
  status: BlogStatus;
  excerpt: string | null;
  coverImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  body: string;
  category: BlogCategoryRecord | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  readingMinutes: number;
};

export type BlogDirectorySummary = {
  total: number;
  draft: number;
  published: number;
  archived: number;
};

export type BlogDirectoryFilters = {
  q?: string;
  status?: BlogStatus | "ALL";
};

export type BlogDirectoryResponse = {
  posts: BlogPostRecord[];
  categories: BlogCategoryRecord[];
  summary: BlogDirectorySummary;
  filters: {
    q: string;
    status: BlogStatus | "ALL";
  };
};

export type BlogPostUpsertInput = {
  title: string;
  slug: string;
  categoryId: string | null;
  status: BlogStatus;
  excerpt: string;
  coverImageUrl: string;
  seoTitle: string;
  seoDescription: string;
  body: string;
};

export type BlogPostUpdateInput = Partial<BlogPostUpsertInput> & {
  id: string;
};
