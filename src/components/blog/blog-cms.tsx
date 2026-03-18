"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Eye,
  FilePenLine,
  Loader2,
  Newspaper,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { BLOG_STATUS } from "@/constants/blogStatus";
import { EmptyState } from "@/components/feedback/empty-state";
import { UploadField } from "@/components/forms/upload-field";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Textarea } from "@/components/ui/textarea";
import { ThemedSelect } from "@/components/ui/themed-select";
import {
  useBlogDirectory,
  useCreateBlogPost,
  useDeleteBlogPost,
  useUpdateBlogPost,
} from "@/hooks/useBlogApi";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { slugifyBlogTitle } from "@/lib/blog/slug";
import { createBlogPostSchema } from "@/lib/validators/blog";
import type { BlogPostRecord } from "@/types/blog";

type BlogEditorInput = z.input<typeof createBlogPostSchema>;
type BlogEditorValues = z.output<typeof createBlogPostSchema>;

const defaultValues: BlogEditorInput = {
  title: "",
  slug: "",
  categoryId: "",
  status: "DRAFT",
  excerpt: "",
  coverImageUrl: "",
  seoTitle: "",
  seoDescription: "",
  body: "",
};

const statusToneMap = {
  DRAFT: "border-transparent bg-warning/15 text-warning",
  PUBLISHED: "border-transparent bg-success/15 text-success",
  ARCHIVED: "border-transparent bg-muted text-muted-foreground",
} as const;

function formatDateTime(value: string | null) {
  return value ? format(new Date(value), "dd MMM yyyy, hh:mm a") : "Not set";
}

type BlogCmsProps = {
  hideHeader?: boolean;
};

export function BlogCms({ hideHeader = false }: BlogCmsProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    (typeof BLOG_STATUS)[number] | "ALL"
  >("ALL");
  const [selectedPost, setSelectedPost] = useState<BlogPostRecord | null>(null);
  const deferredSearch = useDebouncedSearch(search);

  const { canAccess: canManage } = useModuleAccess(["blog.manage"]);
  const directoryQuery = useBlogDirectory({
    q: deferredSearch,
    status: statusFilter,
  });
  const createMutation = useCreateBlogPost();
  const updateMutation = useUpdateBlogPost();
  const deleteMutation = useDeleteBlogPost();

  const form = useForm<BlogEditorInput, unknown, BlogEditorValues>({
    resolver: zodResolver(createBlogPostSchema),
    defaultValues,
  });

  const titleValue = useWatch({
    control: form.control,
    name: "title",
    defaultValue: defaultValues.title,
  });
  const categoryValue = useWatch({
    control: form.control,
    name: "categoryId",
    defaultValue: defaultValues.categoryId,
  });
  const coverImageUrlValue = useWatch({
    control: form.control,
    name: "coverImageUrl",
    defaultValue: defaultValues.coverImageUrl,
  });

  const isSaving = createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  useEffect(() => {
    if (!selectedPost) {
      form.reset(defaultValues);
      return;
    }

    form.reset({
      title: selectedPost.title,
      slug: selectedPost.slug,
      categoryId: selectedPost.category?.id ?? "",
      status: selectedPost.status,
      excerpt: selectedPost.excerpt ?? "",
      coverImageUrl: selectedPost.coverImageUrl ?? "",
      seoTitle: selectedPost.seoTitle ?? "",
      seoDescription: selectedPost.seoDescription ?? "",
      body: selectedPost.body,
    });
  }, [form, selectedPost]);

  function clearEditor() {
    setSelectedPost(null);
  }

  function generateSlugFromTitle() {
    form.setValue("slug", slugifyBlogTitle(titleValue), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function beginEditing(post: BlogPostRecord) {
    setSelectedPost(post);
  }

  function handleDelete(post: BlogPostRecord) {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) {
      return;
    }

    deleteMutation.mutate(
      { id: post.id },
      {
        onSuccess: () => {
          if (selectedPost?.id === post.id) {
            clearEditor();
          }
        },
      },
    );
  }

  function handleSubmit(values: BlogEditorValues) {
    if (selectedPost) {
      updateMutation.mutate(
        {
          id: selectedPost.id,
          ...values,
        },
        {
          onSuccess: () => {
            clearEditor();
          },
        },
      );

      return;
    }

    createMutation.mutate(values, {
      onSuccess: () => {
        form.reset(defaultValues);
      },
    });
  }

  const summary = directoryQuery.data?.summary;
  const categories = directoryQuery.data?.categories ?? [];

  return (
    <div className="space-y-6">
      {hideHeader
        ? null
        : (
          <PageHeader
            eyebrow="Blog CMS"
            title="Publish the public story from the same system running hospital operations."
            description="Phase 2 adds a real admin CMS on top of the seeded blog schema. Published posts appear on the public site, drafts stay internal, and updates run through permission-checked APIs."
            actions={
              <>
                <Link
                  href="/blog"
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                >
                  Open public blog
                </Link>
                {selectedPost
                  ? (
                    <Button
                      onClick={clearEditor}
                      size="sm"
                      type="button"
                    >
                      New post
                    </Button>
                  )
                  : null}
              </>
            }
          />
        )}

      <section className="grid gap-4 xl:grid-cols-4">
        {[
          ["Posts", summary?.total ?? 0, "All CMS records"],
          ["Published", summary?.published ?? 0, "Publicly visible"],
          ["Drafts", summary?.draft ?? 0, "Internal editorial work"],
          ["Archived", summary?.archived ?? 0, "Hidden but retained"],
        ].map(([label, value, detail]) => (
          <SurfaceCard key={label} className="p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {value}
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{detail}</p>
          </SurfaceCard>
        ))}
      </section>

      <section className="grid gap-6 2xl:grid-cols-[0.92fr_1.08fr]">
        <SurfaceCard className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {selectedPost ? "Edit article" : "Create article"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {selectedPost
                  ? selectedPost.title
                  : "Draft the next public update"}
              </h2>
            </div>
          </div>

          {canManage
            ? (
              <form
                className="mt-6 space-y-5"
                onSubmit={form.handleSubmit(handleSubmit)}
              >
                <label className="block">
                  <span className="text-sm font-medium text-ink">Title</span>
                  <Input
                    {...form.register("title")}
                    className="mt-2"
                    placeholder="Why invite-only staff access matters in hospital systems"
                  />
                  <p className="mt-2 text-sm text-danger">
                    {form.formState.errors.title?.message}
                  </p>
                </label>

                <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Slug</span>
                    <Input
                      {...form.register("slug")}
                      className="mt-2"
                      placeholder="invite-only-staff-access-matters"
                    />
                    <p className="mt-2 text-sm text-danger">
                      {form.formState.errors.slug?.message}
                    </p>
                  </label>

                  <Button
                    className="mt-7"
                    onClick={generateSlugFromTitle}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-ink">
                      Category
                    </span>
                    <ThemedSelect
                      className="mt-2"
                      onChange={(event) =>
                        form.setValue("categoryId", event.target.value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })}
                      value={categoryValue ?? ""}
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </ThemedSelect>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-ink">Status</span>
                    <ThemedSelect
                      {...form.register("status")}
                      className="mt-2"
                    >
                      {BLOG_STATUS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </ThemedSelect>
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-ink">Excerpt</span>
                  <Textarea
                    {...form.register("excerpt")}
                    className="mt-2 min-h-24"
                    placeholder="A short public summary for cards and SEO snippets."
                  />
                  <p className="mt-2 text-sm text-danger">
                    {form.formState.errors.excerpt?.message}
                  </p>
                </label>

                <UploadField
                  description="Used in public blog cards, article headers, and social previews."
                  label="Cover image"
                  onChange={(value) =>
                    form.setValue("coverImageUrl", value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })}
                  target="BLOG_COVER"
                  value={coverImageUrlValue ?? ""}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-ink">SEO title</span>
                    <Input
                      {...form.register("seoTitle")}
                      className="mt-2"
                      placeholder="Custom page title for search and sharing"
                    />
                    <p className="mt-2 text-sm text-danger">
                      {form.formState.errors.seoTitle?.message}
                    </p>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-ink">
                      SEO description
                    </span>
                    <Textarea
                      {...form.register("seoDescription")}
                      className="mt-2 min-h-24"
                      placeholder="Search and social description override"
                    />
                    <p className="mt-2 text-sm text-danger">
                      {form.formState.errors.seoDescription?.message}
                    </p>
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-ink">Body</span>
                  <Textarea
                    {...form.register("body")}
                    className="mt-2 min-h-72"
                    placeholder="Write the article body here. Separate paragraphs with blank lines."
                  />
                  <p className="mt-2 text-sm text-danger">
                    {form.formState.errors.body?.message}
                  </p>
                </label>

                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={isSaving}
                    type="submit"
                  >
                    {isSaving
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : selectedPost
                      ? <FilePenLine className="h-4 w-4" />
                      : <Plus className="h-4 w-4" />}
                    {selectedPost ? "Save article" : "Create article"}
                  </Button>

                  <div className="management-selection-pill px-4 py-3 text-sm text-muted-foreground">
                    {titleValue
                      ? slugifyBlogTitle(titleValue)
                      : "Slug preview will appear here"}
                  </div>
                </div>
              </form>
            )
            : (
              <EmptyState
                className="mt-6 min-h-56"
                description="This route is visible because you have blog viewing access, but editing requires the blog.manage permission."
                icon={Newspaper}
                title="Read-only access"
              />
            )}
        </SurfaceCard>

        <SurfaceCard className="p-5 sm:p-6">
          <div className="management-toolbar-shell">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Editorial queue
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                Drafts, published articles, and archived records
              </h2>
            </div>

            <div className="management-toolbar-actions">
              <label className="management-search-shell">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  className="h-auto min-w-44 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search title, slug, category"
                  value={search}
                />
              </label>

              <ThemedSelect
                className="min-w-40"
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as (typeof BLOG_STATUS)[number] | "ALL",
                  )}
                value={statusFilter}
              >
                <option value="ALL">All statuses</option>
                {BLOG_STATUS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </ThemedSelect>

              <Button
                onClick={() => void directoryQuery.refetch()}
                size="sm"
                type="button"
                variant="outline"
              >
                {directoryQuery.isFetching
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <RefreshCcw className="h-4 w-4" />}
                Refresh
              </Button>
            </div>
          </div>

          {directoryQuery.isLoading
            ? (
              <div className="management-subtle-card mt-6 flex min-h-72 items-center justify-center border-dashed text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading blog posts
              </div>
            )
            : directoryQuery.data && directoryQuery.data.posts.length > 0
            ? (
              <div className="mt-6 space-y-4">
                {directoryQuery.data.posts.map((post) => (
                  <article
                    key={post.id}
                    className={`rounded-xl border p-5 shadow-sm transition ${
                      selectedPost?.id === post.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      {post.coverImageUrl
                        ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={post.title}
                            className="h-14 w-14 rounded-[18px] border border-border/70 object-cover"
                            src={post.coverImageUrl}
                          />
                        )
                        : null}
                      <h3 className="text-xl font-semibold text-foreground">
                        {post.title}
                      </h3>
                          <Badge
                            className={statusToneMap[post.status]}
                            variant="outline"
                          >
                            {post.status}
                          </Badge>
                          {post.category
                            ? (
                              <Badge variant="secondary">
                                {post.category.name}
                              </Badge>
                            )
                            : null}
                        </div>

                        <p className="text-sm leading-7 text-muted-foreground">
                          {post.excerpt ?? post.body.slice(0, 180)}
                        </p>

                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="management-metric px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              Slug
                            </p>
                            <p className="mt-2 text-sm font-medium text-foreground">
                              {post.slug}
                            </p>
                          </div>
                          <div className="management-metric px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              Published
                            </p>
                            <p className="mt-2 text-sm font-medium text-foreground">
                              {formatDateTime(post.publishedAt)}
                            </p>
                          </div>
                          <div className="management-metric px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              Updated
                            </p>
                            <p className="mt-2 text-sm font-medium text-foreground">
                              {formatDateTime(post.updatedAt)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 xl:w-64 xl:justify-end">
                        <Button
                          onClick={() => beginEditing(post)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <FilePenLine className="h-4 w-4" />
                          Edit
                        </Button>

                        {post.status === "PUBLISHED"
                          ? (
                            <Link
                              className={buttonVariants({ size: "sm", variant: "outline" })}
                              href={`/blog/${post.slug}`}
                              target="_blank"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Link>
                          )
                          : null}

                        {canManage
                          ? (
                            <Button
                              className="border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleDelete(post)}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          )
                          : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )
            : (
              <EmptyState
                className="mt-6"
                description="Create the first article in the editor to populate the public blog and the admin publishing queue."
                icon={Newspaper}
                title="No blog posts yet"
              />
            )}
        </SurfaceCard>
      </section>
    </div>
  );
}
