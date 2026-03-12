import { CalendarDays, Clock3, Newspaper } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { PublicSiteChrome } from "@/components/public/public-site-chrome";
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
              className="bg-white"
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
                  className="flex h-full flex-col bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(232,240,245,0.68)_100%)]"
                >
                  {post.coverImageUrl
                    ? (
                      <div className="mb-5 overflow-hidden rounded-[24px] border border-border/70">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt={post.title}
                          className="h-52 w-full object-cover"
                          src={post.coverImageUrl}
                        />
                      </div>
                    )
                    : null}
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em]">
                    <span className="rounded-full bg-[rgba(15,118,110,0.12)] px-3 py-1 text-brand">
                      {post.category?.name ?? "Hospital operations"}
                    </span>
                    <span className="rounded-full bg-[rgba(21,94,239,0.12)] px-3 py-1 text-accent">
                      Published
                    </span>
                  </div>

                  <h2 className="mt-5 text-3xl font-semibold tracking-tight text-ink">
                    {post.title}
                  </h2>
                  <p className="mt-4 text-base leading-7 text-ink-soft">
                    {post.seoDescription ?? post.excerpt ?? post.body.slice(0, 180)}
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-ink-soft">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-brand" />
                      {formatPublishDate(post.publishedAt)}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-brand" />
                      {post.readingMinutes} min read
                    </span>
                  </div>

                  <div className="mt-8">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong"
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
