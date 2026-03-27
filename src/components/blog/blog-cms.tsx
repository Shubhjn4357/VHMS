"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  BookText,
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
import { FormDrawerSection } from "@/components/ui/form-drawer";
import { Input } from "@/components/ui/input";
import { NativeImage } from "@/components/ui/native-image";
import { PageHeader } from "@/components/ui/page-header";
import {
  RecordPreviewDialog,
  RecordPreviewField,
  RecordPreviewSection,
} from "@/components/ui/record-preview-dialog";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Textarea } from "@/components/ui/textarea";
import { ThemedSelect } from "@/components/ui/themed-select";
import { useConfirmationDialog } from "@/hooks/useConfirmationDialog";
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
type BlogFocus = "all" | "published" | "draft" | "with-cover" | "recent";
type BlogCmsProps = { hideHeader?: boolean };

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

const focusMeta: Record<BlogFocus, { label: string; detail: string }> = {
  all: { label: "All records", detail: "Full editorial queue" },
  published: { label: "Published", detail: "Live public articles" },
  draft: { label: "Drafts", detail: "Internal writing work" },
  "with-cover": { label: "With cover", detail: "Hero image assigned" },
  recent: { label: "Recent", detail: "Updated in 14 days" },
};

const statusToneMap = {
  DRAFT: "border-transparent bg-warning/15 text-warning",
  PUBLISHED: "border-transparent bg-success/15 text-success",
  ARCHIVED: "border-transparent bg-muted text-muted-foreground",
} as const;

function formatDateTime(value: string | null) {
  return value ? format(new Date(value), "dd MMM yyyy, hh:mm a") : "Not set";
}

function isRecent(post: BlogPostRecord) {
  return Date.now() - new Date(post.updatedAt).getTime() <= 1000 * 60 * 60 * 24 * 14;
}

function matchesFocus(post: BlogPostRecord, focus: BlogFocus) {
  if (focus === "published") return post.status === "PUBLISHED";
  if (focus === "draft") return post.status === "DRAFT";
  if (focus === "with-cover") return Boolean(post.coverImageUrl);
  if (focus === "recent") return isRecent(post);
  return true;
}

export function BlogCms({ hideHeader = false }: BlogCmsProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof BLOG_STATUS)[number] | "ALL">("ALL");
  const [focus, setFocus] = useState<BlogFocus>("all");
  const [editingPost, setEditingPost] = useState<BlogPostRecord | null>(null);
  const [previewPost, setPreviewPost] = useState<BlogPostRecord | null>(null);
  const deferredSearch = useDebouncedSearch(search);
  const { canAccess: canManage } = useModuleAccess(["blog.manage"]);
  const directoryQuery = useBlogDirectory({ q: deferredSearch, status: statusFilter });
  const createMutation = useCreateBlogPost();
  const updateMutation = useUpdateBlogPost();
  const deleteMutation = useDeleteBlogPost();
  const confirm = useConfirmationDialog();

  const form = useForm<BlogEditorInput, unknown, BlogEditorValues>({
    resolver: zodResolver(createBlogPostSchema),
    defaultValues,
  });
  const titleValue = useWatch({ control: form.control, name: "title", defaultValue: "" });
  const categoryValue = useWatch({ control: form.control, name: "categoryId", defaultValue: "" });
  const coverImageUrlValue = useWatch({ control: form.control, name: "coverImageUrl", defaultValue: "" });
  const isSaving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  useEffect(() => {
    if (!editingPost) {
      form.reset(defaultValues);
      return;
    }

    form.reset({
      title: editingPost.title,
      slug: editingPost.slug,
      categoryId: editingPost.category?.id ?? "",
      status: editingPost.status,
      excerpt: editingPost.excerpt ?? "",
      coverImageUrl: editingPost.coverImageUrl ?? "",
      seoTitle: editingPost.seoTitle ?? "",
      seoDescription: editingPost.seoDescription ?? "",
      body: editingPost.body,
    });
  }, [editingPost, form]);

  async function handleDelete(post: BlogPostRecord) {
    const confirmed = await confirm({
      title: "Delete blog post?",
      description: `Delete "${post.title}"? This cannot be undone.`,
      confirmLabel: "Delete post",
      tone: "danger",
    });
    if (!confirmed) return;

    deleteMutation.mutate(
      { id: post.id },
      {
        onSuccess: () => {
          if (editingPost?.id === post.id) setEditingPost(null);
          if (previewPost?.id === post.id) setPreviewPost(null);
        },
      },
    );
  }

  function handleSubmit(values: BlogEditorValues) {
    if (editingPost) {
      updateMutation.mutate(
        { id: editingPost.id, ...values },
        { onSuccess: () => setEditingPost(null) },
      );
      return;
    }

    createMutation.mutate(values, { onSuccess: () => form.reset(defaultValues) });
  }

  const summary = directoryQuery.data?.summary;
  const categories = directoryQuery.data?.categories ?? [];
  const posts = directoryQuery.data?.posts ?? [];
  const filteredPosts = posts.filter((post) => matchesFocus(post, focus));
  const focusCounts: Record<BlogFocus, number> = {
    all: posts.length,
    published: posts.filter((post) => post.status === "PUBLISHED").length,
    draft: posts.filter((post) => post.status === "DRAFT").length,
    "with-cover": posts.filter((post) => Boolean(post.coverImageUrl)).length,
    recent: posts.filter((post) => isRecent(post)).length,
  };
  const latestPublished = posts.find((post) => post.status === "PUBLISHED") ?? null;

  return (
    <div className="space-y-6">
      {hideHeader
        ? null
        : (
          <PageHeader
            eyebrow="Blog CMS"
            title="Publish the public story from the same system running hospital operations."
            description="Published posts appear on the public site, drafts stay internal, and updates run through permission-checked APIs."
            actions={(
              <>
                <Link className={buttonVariants({ size: "sm", variant: "outline" })} href="/blog">
                  Open public blog
                </Link>
                {editingPost
                  ? (
                    <Button onClick={() => setEditingPost(null)} size="sm" type="button">
                      New post
                    </Button>
                  )
                  : null}
              </>
            )}
          />
        )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_repeat(2,minmax(0,0.6fr))]">
        <SurfaceCard className="p-5 xl:col-span-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Workspace controls
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            Focus the editorial queue before opening the full article or editor
          </h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            Search with the server-backed directory, then narrow the queue by publication
            state, media readiness, or recent activity.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {(Object.keys(focusMeta) as BlogFocus[]).map((value) => (
              <Button
                className="h-auto min-w-[10rem] justify-between rounded-[var(--radius-panel)] px-4 py-3 text-left"
                key={value}
                onClick={() => setFocus(value)}
                size="sm"
                type="button"
                variant={focus === value ? "secondary" : "outline"}
              >
                <span className="flex min-w-0 flex-col items-start">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                    {focusMeta[value].label}
                  </span>
                  <span className="text-[11px] font-medium normal-case text-muted-foreground">
                    {focusMeta[value].detail}
                  </span>
                </span>
                <Badge variant={focus === value ? "secondary" : "outline"}>
                  {focusCounts[value]}
                </Badge>
              </Button>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <p className="text-sm text-muted-foreground">Matching articles</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {filteredPosts.length}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Current result set in the active editorial view.
          </p>
        </SurfaceCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {[
          ["Posts", summary?.total ?? 0, "All CMS records"],
          ["Published", summary?.published ?? 0, "Publicly visible"],
          ["With cover", focusCounts["with-cover"], "Hero image assigned"],
          [
            "Latest live",
            latestPublished?.readingMinutes ?? 0,
            latestPublished?.title ?? "No published article",
          ],
        ].map(([label, value, detail]) => (
          <SurfaceCard className="p-5" key={String(label)}>
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
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {editingPost ? "Edit article" : "Create article"}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {editingPost ? editingPost.title : "Draft the next public update"}
          </h2>

          {canManage
            ? (
              <form className="mt-6 space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
                <FormDrawerSection title="Story identity">
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Title</span>
                    <Input {...form.register("title")} className="mt-2" />
                    <p className="mt-2 text-sm text-danger">
                      {form.formState.errors.title?.message}
                    </p>
                  </label>
                  <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                    <label className="block">
                      <span className="text-sm font-medium text-ink">Slug</span>
                      <Input {...form.register("slug")} className="mt-2" />
                      <p className="mt-2 text-sm text-danger">
                        {form.formState.errors.slug?.message}
                      </p>
                    </label>
                    <Button
                      className="mt-7"
                      onClick={() =>
                        form.setValue("slug", slugifyBlogTitle(titleValue), {
                          shouldDirty: true,
                          shouldValidate: true,
                        })}
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
                      <span className="text-sm font-medium text-ink">Category</span>
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
                      <ThemedSelect {...form.register("status")} className="mt-2">
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
                    <Textarea {...form.register("excerpt")} className="mt-2 min-h-24" />
                    <p className="mt-2 text-sm text-danger">
                      {form.formState.errors.excerpt?.message}
                    </p>
                  </label>
                </FormDrawerSection>

                <FormDrawerSection title="Cover and SEO">
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
                      <Input {...form.register("seoTitle")} className="mt-2" />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-ink">SEO description</span>
                      <Textarea {...form.register("seoDescription")} className="mt-2 min-h-24" />
                    </label>
                  </div>
                </FormDrawerSection>

                <FormDrawerSection title="Article body">
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Body</span>
                    <Textarea {...form.register("body")} className="mt-2 min-h-72" />
                    <p className="mt-2 text-sm text-danger">
                      {form.formState.errors.body?.message}
                    </p>
                  </label>
                </FormDrawerSection>

                <div className="flex flex-wrap gap-3">
                  <Button disabled={isSaving} type="submit">
                    {isSaving
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : editingPost
                      ? <FilePenLine className="h-4 w-4" />
                      : <Plus className="h-4 w-4" />}
                    {editingPost ? "Save article" : "Create article"}
                  </Button>
                  <div className="management-selection-pill px-4 py-3 text-sm text-muted-foreground">
                    {titleValue ? slugifyBlogTitle(titleValue) : "Slug preview will appear here"}
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
                  setStatusFilter(event.target.value as (typeof BLOG_STATUS)[number] | "ALL")}
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
            : posts.length > 0
            ? (
              <div className="mt-6 space-y-4">
                {filteredPosts.length === 0
                  ? (
                    <EmptyState
                      className="min-h-72"
                      description={`No posts match the current ${focusMeta[focus].label.toLowerCase()} view.`}
                      icon={BookText}
                      title="No editorial records in this workspace"
                    />
                  )
                  : null}
                {filteredPosts.map((post) => (
                  <article
                    className={`rounded-xl border p-5 shadow-sm transition ${
                      editingPost?.id === post.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card"
                    }`}
                    key={post.id}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          {post.coverImageUrl
                            ? (
                              <NativeImage
                                alt={post.title}
                                className="h-14 w-14 rounded-[var(--radius-control)] border border-border/70 object-cover"
                                src={post.coverImageUrl}
                              />
                            )
                            : null}
                          <h3 className="text-xl font-semibold text-foreground">{post.title}</h3>
                          <Badge className={statusToneMap[post.status]} variant="outline">
                            {post.status}
                          </Badge>
                          {post.category ? <Badge variant="secondary">{post.category.name}</Badge> : null}
                        </div>
                        <p className="text-sm leading-7 text-muted-foreground">
                          {post.excerpt ?? post.body.slice(0, 180)}
                        </p>
                        <div className="grid gap-3 md:grid-cols-4">
                          <div className="management-metric px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Slug</p>
                            <p className="mt-2 text-sm font-medium text-foreground">{post.slug}</p>
                          </div>
                          <div className="management-metric px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Published</p>
                            <p className="mt-2 text-sm font-medium text-foreground">{formatDateTime(post.publishedAt)}</p>
                          </div>
                          <div className="management-metric px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Updated</p>
                            <p className="mt-2 text-sm font-medium text-foreground">{formatDateTime(post.updatedAt)}</p>
                          </div>
                          <div className="management-metric px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Read time</p>
                            <p className="mt-2 text-sm font-medium text-foreground">{post.readingMinutes} min</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 xl:w-72 xl:justify-end">
                        <Button onClick={() => setPreviewPost(post)} size="sm" type="button" variant="outline">
                          <BookText className="h-4 w-4" />
                          Details
                        </Button>
                        <Button onClick={() => setEditingPost(post)} size="sm" type="button" variant="outline">
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

      <RecordPreviewDialog
        actions={previewPost?.status === "PUBLISHED"
          ? (
            <Button asChild size="sm" type="button" variant="outline">
              <Link href={`/blog/${previewPost.slug}`} target="_blank">
                <Eye className="h-4 w-4" />
                Open live article
              </Link>
            </Button>
          )
          : undefined}
        description={previewPost
          ? "Inspect public metadata, publication posture, and article content before editing or publishing."
          : undefined}
        eyebrow="Blog article"
        onOpenChange={(open) => {
          if (!open) setPreviewPost(null);
        }}
        open={previewPost !== null}
        status={previewPost
          ? <Badge className={statusToneMap[previewPost.status]} variant="outline">{previewPost.status}</Badge>
          : undefined}
        title={previewPost?.title ?? "Blog article detail"}
      >
        {previewPost
          ? (
            <>
              <RecordPreviewSection title="Article identity">
                <RecordPreviewField label="Slug" value={previewPost.slug} />
                <RecordPreviewField label="Category" value={previewPost.category?.name ?? "Uncategorized"} />
                <RecordPreviewField label="Reading time" value={`${previewPost.readingMinutes} min`} />
                <RecordPreviewField label="Published" value={formatDateTime(previewPost.publishedAt)} />
              </RecordPreviewSection>
              <RecordPreviewSection title="Preview">
                <RecordPreviewField
                  className="md:col-span-2"
                  label="Cover image"
                  value={previewPost.coverImageUrl
                    ? (
                      <NativeImage
                        alt={previewPost.title}
                        className="h-48 w-full rounded-2xl border border-border/70 object-cover"
                        src={previewPost.coverImageUrl}
                      />
                    )
                    : "No cover image"}
                />
                <RecordPreviewField label="SEO title" value={previewPost.seoTitle ?? "Uses article title"} />
                <RecordPreviewField label="SEO description" value={previewPost.seoDescription ?? "Uses excerpt/body fallback"} />
              </RecordPreviewSection>
              <RecordPreviewSection className="md:[&>div]:grid-cols-1" title="Content">
                <RecordPreviewField className="md:col-span-1" label="Excerpt" value={previewPost.excerpt ?? "No excerpt"} />
                <RecordPreviewField
                  className="md:col-span-1"
                  label="Body"
                  value={<div className="whitespace-pre-wrap text-sm leading-7">{previewPost.body}</div>}
                />
              </RecordPreviewSection>
            </>
          )
          : null}
      </RecordPreviewDialog>
    </div>
  );
}
