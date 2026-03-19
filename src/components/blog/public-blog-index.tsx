import { CalendarDays, Clock3, Newspaper } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { PublicSiteChrome } from "@/components/public/public-site-chrome";
import { NativeImage } from "@/components/ui/native-image";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import type { BlogPostRecord } from "@/types/blog";

function formatPublishDate(value: string | null) {
  return value ? format(new Date(value), "dd MMM yyyy") : "Unpublished";
}

export function PublicBlogIndex({
  posts,
}: {
  posts: BlogPostRecord[];
}) {
  return (
    <PublicSiteChrome>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Product journal"
          title="Hospital workflow notes, launch updates, and operating insights."
          description="This public blog is the SEO-facing phase-2 content surface. Published articles come from the same CMS used inside the admin dashboard."
        />

        {posts.length === 0
          ? (
            <EmptyState
              className="bg-surface"
              description="No public articles are published yet. Drafts can be written inside the dashboard blog CMS and published when ready."
              icon={Newspaper}
              title="Blog launch space is ready"
            />
          )
          : (
            <div className="grid gap-5 xl:grid-cols-2">
              {posts.map((post) => (
                <SurfaceCard
                  key={post.id}
                  className="management-record-shell flex h-full flex-col"
                >
                  {post.coverImageUrl
                    ? (
                      <div className="mb-5 overflow-hidden rounded-xl border border-border/70">
                        <NativeImage
                          alt={post.title}
                          className="h-52 w-full object-cover"
                          src={post.coverImageUrl}
                        />
                      </div>
                    )
                    : null}
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em]">
                    <span className="rounded-md bg-secondary px-3 py-1 text-secondary-foreground">
                      {post.category?.name ?? "Hospital operations"}
                    </span>
                    <span className="rounded-md bg-accent px-3 py-1 text-accent-foreground">
                      Published
                    </span>
                  </div>

                  <h2 className="mt-5 text-3xl font-semibold tracking-tight text-foreground">
                    {post.title}
                  </h2>
                  <p className="mt-4 text-base leading-7 text-muted-foreground">
                    {post.seoDescription ?? post.excerpt ?? post.body.slice(0, 180)}
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      {formatPublishDate(post.publishedAt)}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-primary" />
                      {post.readingMinutes} min read
                    </span>
                  </div>

                  <div className="mt-8">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                    >
                      Read article
                    </Link>
                  </div>
                </SurfaceCard>
              ))}
            </div>
          )}
      </div>
    </PublicSiteChrome>
  );
}
