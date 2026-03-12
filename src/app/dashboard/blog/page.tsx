export { dashboardBlogMetadata as metadata } from "@/app/dashboard/page-metadata";

import dynamic from "next/dynamic";

import { DashboardRouteSkeleton } from "@/components/layout/route-skeletons";
import { PageHeader } from "@/components/ui/page-header";

const BlogCms = dynamic(
  () => import("@/components/blog/blog-cms").then((mod) => mod.BlogCms),
  {
    loading: () => <DashboardRouteSkeleton variant="workspace" />,
  },
);

export default function DashboardBlogPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Public site"
        title="Blog CMS"
        description="Create, edit, publish, and archive public-facing product content from the dedicated internal content route."
      />
      <BlogCms hideHeader />
    </div>
  );
}
