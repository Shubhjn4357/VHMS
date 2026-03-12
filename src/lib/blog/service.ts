import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { makeId } from "@/db/schema/shared";
import { blogCategories, blogPosts } from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/log";
import { ApiError } from "@/lib/api/errors";
import { slugifyBlogTitle } from "@/lib/blog/slug";
import type {
  BlogCategoryRecord,
  BlogDirectoryFilters,
  BlogDirectoryResponse,
  BlogPostRecord,
  BlogPostUpdateInput,
  BlogPostUpsertInput,
} from "@/types/blog";

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function estimateReadingMinutes(body: string) {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function toCategoryRecord(
  row: typeof blogCategories.$inferSelect,
): BlogCategoryRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
  };
}

function toBlogPostRecord(
  row: typeof blogPosts.$inferSelect,
  categoryMap: Map<string, BlogCategoryRecord>,
): BlogPostRecord {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    excerpt: row.excerpt,
    coverImageUrl: row.coverImageUrl ?? null,
    seoTitle: row.seoTitle ?? null,
    seoDescription: row.seoDescription ?? null,
    body: row.body,
    category: row.categoryId ? categoryMap.get(row.categoryId) ?? null : null,
    publishedAt: toIsoString(row.publishedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    readingMinutes: estimateReadingMinutes(row.body),
  };
}

async function loadBlogCategories() {
  const db = getDb();
  const rows = await db.select().from(blogCategories).orderBy(
    blogCategories.name,
  );
  return rows.map(toCategoryRecord);
}

function sortPublicPosts(posts: BlogPostRecord[]) {
  return posts.sort((left, right) => {
    const leftValue = left.publishedAt ?? left.updatedAt;
    const rightValue = right.publishedAt ?? right.updatedAt;
    return rightValue.localeCompare(leftValue);
  });
}

function sortAdminPosts(posts: BlogPostRecord[]) {
  return posts.sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );
}

async function resolveCategoryId(categoryId: string | null) {
  if (!categoryId) {
    return null;
  }

  const db = getDb();
  const [categoryRow] = await db
    .select()
    .from(blogCategories)
    .where(eq(blogCategories.id, categoryId))
    .limit(1);

  if (!categoryRow) {
    throw new ApiError(400, "Selected blog category does not exist.");
  }

  return categoryRow.id;
}

async function ensureUniqueSlug(slug: string, excludeId?: string) {
  const db = getDb();
  const [existingPost] = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.slug, slug))
    .limit(1);

  if (existingPost && existingPost.id !== excludeId) {
    throw new ApiError(409, "Another blog post already uses this slug.");
  }
}

async function getBlogPostRecordById(id: string) {
  const db = getDb();
  const [postRow] = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.id, id))
    .limit(1);

  if (!postRow) {
    return null;
  }

  const categories = await loadBlogCategories();
  return toBlogPostRecord(
    postRow,
    new Map(categories.map((category) => [category.id, category])),
  );
}

function summarize(posts: BlogPostRecord[]) {
  return {
    total: posts.length,
    draft: posts.filter((post) => post.status === "DRAFT").length,
    published: posts.filter((post) => post.status === "PUBLISHED").length,
    archived: posts.filter((post) => post.status === "ARCHIVED").length,
  };
}

function normalizeBlogInput(input: BlogPostUpsertInput) {
  const title = input.title.trim();
  const body = input.body.trim();
  const excerpt = input.excerpt.trim() || null;
  const coverImageUrl = input.coverImageUrl.trim() || null;
  const seoTitle = input.seoTitle.trim() || null;
  const seoDescription = input.seoDescription.trim() || null;
  const slug = slugifyBlogTitle(input.slug || title);

  if (!slug) {
    throw new ApiError(400, "Unable to generate a valid blog slug.");
  }

  return {
    title,
    body,
    excerpt,
    coverImageUrl,
    seoTitle,
    seoDescription,
    slug,
    categoryId: input.categoryId,
    status: input.status,
  };
}

export async function listPublicBlogPosts() {
  const db = getDb();
  const categories = await loadBlogCategories();
  const categoryMap = new Map(
    categories.map((category) => [category.id, category]),
  );
  const rows = await db
    .select()
    .from(blogPosts)
    .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.updatedAt));

  const publishedPosts = rows
    .filter((row) => row.status === "PUBLISHED")
    .map((row) => toBlogPostRecord(row, categoryMap));

  return sortPublicPosts(publishedPosts);
}

export async function getPublishedBlogPostBySlug(slug: string) {
  const normalizedSlug = slug.trim().toLowerCase();
  const posts = await listPublicBlogPosts();
  return posts.find((post) => post.slug === normalizedSlug) ?? null;
}

export async function listAdminBlogPosts(
  filters: BlogDirectoryFilters = {},
): Promise<BlogDirectoryResponse> {
  const db = getDb();
  const categories = await loadBlogCategories();
  const categoryMap = new Map(
    categories.map((category) => [category.id, category]),
  );
  const rows = await db
    .select()
    .from(blogPosts)
    .orderBy(desc(blogPosts.updatedAt), desc(blogPosts.createdAt));

  const query = filters.q?.trim().toLowerCase() ?? "";
  const status = filters.status ?? "ALL";
  const posts = rows
    .map((row) => toBlogPostRecord(row, categoryMap))
    .filter((post) => {
      const matchesStatus = status === "ALL" || post.status === status;

      if (!matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        post.title,
        post.slug,
        post.status,
        post.category?.name ?? "",
        post.excerpt ?? "",
        post.seoTitle ?? "",
        post.seoDescription ?? "",
      ].some((value) => value.toLowerCase().includes(query));
    });

  return {
    posts: sortAdminPosts(posts),
    categories,
    summary: summarize(posts),
    filters: {
      q: query,
      status,
    },
  };
}

export async function createBlogPost(
  input: BlogPostUpsertInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const normalized = normalizeBlogInput(input);
  const categoryId = await resolveCategoryId(normalized.categoryId);

  await ensureUniqueSlug(normalized.slug);

  const id = makeId("blp");
  const now = new Date();

  await db.insert(blogPosts).values({
    id,
    categoryId,
    title: normalized.title,
    slug: normalized.slug,
    status: normalized.status,
    excerpt: normalized.excerpt,
    coverImageUrl: normalized.coverImageUrl,
    seoTitle: normalized.seoTitle,
    seoDescription: normalized.seoDescription,
    body: normalized.body,
    publishedAt: normalized.status === "PUBLISHED" ? now : null,
    updatedAt: now,
  });

  await recordAuditLog({
    actorUserId,
    action: normalized.status === "PUBLISHED"
      ? "blog.published"
      : "blog.created",
    entityType: "blog_post",
    entityId: id,
    metadata: {
      slug: normalized.slug,
      status: normalized.status,
      title: normalized.title,
    },
  });

  return getBlogPostRecordById(id);
}

export async function updateBlogPost(
  input: BlogPostUpdateInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const [existingPost] = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.id, input.id))
    .limit(1);

  if (!existingPost) {
    throw new ApiError(404, "Blog post not found.");
  }

  const title = input.title?.trim() ?? existingPost.title;
  const nextSlugSource = input.slug ?? existingPost.slug;
  const slug = slugifyBlogTitle(nextSlugSource || title);
  const status = input.status ?? existingPost.status;
  const excerpt = input.excerpt === undefined
    ? existingPost.excerpt
    : input.excerpt.trim() || null;
  const coverImageUrl = input.coverImageUrl === undefined
    ? existingPost.coverImageUrl
    : input.coverImageUrl.trim() || null;
  const seoTitle = input.seoTitle === undefined
    ? existingPost.seoTitle
    : input.seoTitle.trim() || null;
  const seoDescription = input.seoDescription === undefined
    ? existingPost.seoDescription
    : input.seoDescription.trim() || null;
  const body = input.body?.trim() ?? existingPost.body;
  const categoryId = await resolveCategoryId(
    input.categoryId === undefined ? existingPost.categoryId : input.categoryId,
  );

  if (!slug) {
    throw new ApiError(400, "Unable to generate a valid blog slug.");
  }

  await ensureUniqueSlug(slug, existingPost.id);

  const publishedAt = status === "PUBLISHED"
    ? existingPost.publishedAt ?? new Date()
    : status === "DRAFT"
    ? null
    : existingPost.publishedAt;

  await db
    .update(blogPosts)
    .set({
      title,
      slug,
      categoryId,
      status,
      excerpt,
      coverImageUrl,
      seoTitle,
      seoDescription,
      body,
      publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(blogPosts.id, existingPost.id));

  await recordAuditLog({
    actorUserId,
    action: status === "PUBLISHED" && existingPost.status !== "PUBLISHED"
      ? "blog.published"
      : "blog.updated",
    entityType: "blog_post",
    entityId: existingPost.id,
    metadata: {
      slug,
      status,
      title,
    },
  });

  return getBlogPostRecordById(existingPost.id);
}

export async function deleteBlogPost(
  id: string,
  actorUserId?: string | null,
) {
  const db = getDb();
  const [existingPost] = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.id, id))
    .limit(1);

  if (!existingPost) {
    throw new ApiError(404, "Blog post not found.");
  }

  await db.delete(blogPosts).where(eq(blogPosts.id, id));

  await recordAuditLog({
    actorUserId,
    action: "blog.deleted",
    entityType: "blog_post",
    entityId: existingPost.id,
    metadata: {
      slug: existingPost.slug,
      status: existingPost.status,
      title: existingPost.title,
    },
  });
}
