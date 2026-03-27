import type { Metadata } from "next";

import { PublicMarketingPage } from "@/components/public/public-marketing-page";
import { marketingPages } from "@/lib/public-site/marketing-pages";
import { buildPublicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "Operations",
  description:
    "See how Vahi Hospital OS supports front-desk operations, OPD and IPD workflows, occupancy management, billing control, and audit-ready hospital administration.",
  path: "/solutions",
  keywords: [
    "hospital workflow software",
    "OPD IPD solution",
    "hospital operations dashboard",
  ],
});

export default function SolutionsPage() {
  return <PublicMarketingPage content={marketingPages.solutions} />;
}
