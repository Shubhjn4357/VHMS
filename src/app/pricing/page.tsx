import type { Metadata } from "next";

import { PublicMarketingPage } from "@/components/public/public-marketing-page";
import { marketingPages } from "@/lib/public-site/marketing-pages";
import { buildPublicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "Pricing",
  description:
    "Review the implementation-oriented pricing model for Vahi HMS Enterprise across core operations, staged rollouts, and administrative controls.",
  path: "/pricing",
  keywords: [
    "hospital software pricing",
    "HMS implementation pricing",
    "hospital rollout planning",
  ],
});

export default function PricingPage() {
  return <PublicMarketingPage content={marketingPages.pricing} />;
}
