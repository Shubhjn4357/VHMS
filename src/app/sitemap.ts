import type { MetadataRoute } from "next";

import { listPublicBlogPosts } from "@/lib/blog/service";
import { absoluteUrl } from "@/lib/seo/metadata";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogPosts = await listPublicBlogPosts();
  const staticPages = [
    "/",
    "/features",
    "/solutions",
    "/about",
    "/contact",
    "/blog",
    "/login",
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPages.map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : path === "/blog" ? 0.8 : 0.7,
  }));

  const blogEntries: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: post.updatedAt,
    changeFrequency: "weekly",
    priority: 0.75,
  }));

  return [...staticEntries, ...blogEntries];
}
