import type { Metadata } from "next";

import { PublicBlogIndex } from "@/components/blog/public-blog-index";
import { listPublicBlogPosts } from "@/lib/blog/service";
import { buildPublicMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPublicMetadata({
  title: "Blog",
  description:
    "Public updates from Vahi HMS Enterprise covering workflow design, security, operations, hospital rollout, and product thinking.",
  path: "/blog",
  keywords: [
    "hospital operations blog",
    "healthcare workflow articles",
    "HMS product updates",
  ],
});

export default async function BlogPage() {
  const posts = await listPublicBlogPosts();

  return <PublicBlogIndex posts={posts} />;
}
