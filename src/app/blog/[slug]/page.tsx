import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicBlogArticle } from "@/components/blog/public-blog-article";
import { getPublishedBlogPostBySlug } from "@/lib/blog/service";
import { buildPublicMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

type BlogArticlePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "Article not found",
    };
  }

  return buildPublicMetadata({
    title: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.excerpt ?? post.body.slice(0, 140),
    path: `/blog/${post.slug}`,
    imagePath: post.coverImageUrl ?? undefined,
    type: "article",
  });
}

export default async function BlogArticlePage({
  params,
}: BlogArticlePageProps) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return <PublicBlogArticle post={post} />;
}
