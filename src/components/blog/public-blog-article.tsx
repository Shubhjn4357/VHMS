import { ArrowLeft, CalendarDays, Clock3 } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

import { PublicSiteChrome } from "@/components/public/public-site-chrome";
import { NativeImage } from "@/components/ui/native-image";
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
        <SurfaceCard className="overflow-hidden border bg-card shadow-[var(--shadow-card)]">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to blog
          </Link>

          <div className="mt-8 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.18em]">
            <span className="rounded-md bg-secondary px-3 py-1 text-secondary-foreground">
              {post.category?.name ?? "Hospital operations"}
            </span>
            <span className="rounded-md bg-accent px-3 py-1 text-accent-foreground">
              Published article
            </span>
          </div>

          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {post.title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
            {post.seoDescription ?? post.excerpt ??
              "A product and workflow note from the VHMS rollout."}
          </p>

          <div className="mt-8 flex flex-wrap gap-5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              {formatPublishDate(post.publishedAt)}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-primary" />
              {post.readingMinutes} min read
            </span>
          </div>

          {post.coverImageUrl
            ? (
              <div className="mt-8 overflow-hidden rounded-xl border border-border/70">
                <NativeImage
                  alt={post.title}
                  className="h-[22rem] w-full object-cover"
                  eager
                  src={post.coverImageUrl}
                />
              </div>
            )
            : null}
        </SurfaceCard>

        <SurfaceCard className="px-6 py-8 sm:px-10">
          <div className="mx-auto max-w-3xl space-y-6 text-base leading-8 text-muted-foreground">
            {splitParagraphs(post.body).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </SurfaceCard>
      </div>
    </PublicSiteChrome>
  );
}
