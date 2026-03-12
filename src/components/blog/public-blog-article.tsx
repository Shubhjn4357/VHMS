import { ArrowLeft, CalendarDays, Clock3 } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

import { PublicSiteChrome } from "@/components/public/public-site-chrome";
import { SurfaceCard } from "@/components/ui/surface-card";
import type { BlogPostRecord } from "@/types/blog";

function formatPublishDate(value: string | null) {
  return value ? format(new Date(value), "dd MMM yyyy") : "Unpublished";
}

function splitParagraphs(body: string) {
  return body
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function PublicBlogArticle({
  post,
}: {
  post: BlogPostRecord;
}) {
  return (
    <PublicSiteChrome>
      <div className="space-y-6">
        <SurfaceCard className="overflow-hidden bg-[linear-gradient(135deg,#0b4f56_0%,#12263f_52%,#155eef_100%)] text-white shadow-[var(--shadow-card)]">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-white/76 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to blog
          </Link>

          <div className="mt-8 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.18em]">
            <span className="rounded-full bg-white/10 px-3 py-1 text-white/84">
              {post.category?.name ?? "Hospital operations"}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-white/84">
              Published article
            </span>
          </div>

          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
            {post.title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-white/76 sm:text-lg">
            {post.seoDescription ?? post.excerpt ??
              "A product and workflow note from the VHMS rollout."}
          </p>

          <div className="mt-8 flex flex-wrap gap-5 text-sm text-white/72">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-white/84" />
              {formatPublishDate(post.publishedAt)}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-white/84" />
              {post.readingMinutes} min read
            </span>
          </div>

          {post.coverImageUrl
            ? (
              <div className="mt-8 overflow-hidden rounded-[28px] border border-white/12 bg-white/6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={post.title}
                  className="h-[22rem] w-full object-cover"
                  src={post.coverImageUrl}
                />
              </div>
            )
            : null}
        </SurfaceCard>

        <SurfaceCard className="px-6 py-8 sm:px-10">
          <div className="mx-auto max-w-3xl space-y-6 text-base leading-8 text-ink-soft">
            {splitParagraphs(post.body).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </SurfaceCard>
      </div>
    </PublicSiteChrome>
  );
}
