"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import type {
  BlogDirectoryFilters,
  BlogDirectoryResponse,
  BlogPostRecord,
  BlogPostUpdateInput,
  BlogPostUpsertInput,
} from "@/types/blog";

function buildBlogPostsUrl(filters: BlogDirectoryFilters) {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.status && filters.status !== "ALL") {
    params.set("status", filters.status);
  }

  const query = params.toString();
  return query ? `/api/blog/posts?${query}` : "/api/blog/posts";
}

async function invalidateBlogDirectory(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
}

export function useBlogDirectory(filters: BlogDirectoryFilters = {}) {
  return useApiQuery<BlogDirectoryResponse>(
    ["blog-posts", filters.q ?? "", filters.status ?? "ALL"],
    buildBlogPostsUrl(filters),
  );
}

export function useCreateBlogPost() {
  const queryClient = useQueryClient();

  return useApiMutation<BlogPostUpsertInput, BlogPostRecord>(
    {
      method: "post",
      url: "/api/blog/posts",
    },
    {
      onSuccess: async () => {
        toast.success("Blog post created.");
        await invalidateBlogDirectory(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useUpdateBlogPost() {
  const queryClient = useQueryClient();

  return useApiMutation<BlogPostUpdateInput, BlogPostRecord>(
    {
      method: "patch",
      url: (input) => `/api/blog/posts/${input.id}`,
      transform: (input) => ({
        title: input.title,
        slug: input.slug,
        categoryId: input.categoryId,
        status: input.status,
        excerpt: input.excerpt,
        coverImageUrl: input.coverImageUrl,
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
        body: input.body,
      }),
    },
    {
      onSuccess: async () => {
        toast.success("Blog post updated.");
        await invalidateBlogDirectory(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useDeleteBlogPost() {
  const queryClient = useQueryClient();

  return useApiMutation<{ id: string }, { id: string; success: boolean }>(
    {
      method: "delete",
      url: (input) => `/api/blog/posts/${input.id}`,
      transform: () => undefined,
    },
    {
      onSuccess: async () => {
        toast.success("Blog post deleted.");
        await invalidateBlogDirectory(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}
