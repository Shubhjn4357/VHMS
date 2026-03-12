import type { Metadata } from "next";

import { PublicMarketingPage } from "@/components/public/public-marketing-page";
import { marketingPages } from "@/lib/public-site/marketing-pages";
import { buildPublicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "About",
  description:
    "Learn the product direction behind Vahi HMS Enterprise: compact hospital operations, connected patient workflows, print-safe runtime outputs, and governance-aware admin controls.",
  path: "/about",
  keywords: [
    "about hospital management system",
    "hospital operations platform",
    "healthcare admin software",
  ],
});

export default function AboutPage() {
  return <PublicMarketingPage content={marketingPages.about} />;
}
