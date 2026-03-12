import type { Metadata } from "next";

import { PublicMarketingPage } from "@/components/public/public-marketing-page";
import { marketingPages } from "@/lib/public-site/marketing-pages";
import { buildPublicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "Features",
  description:
    "Explore the feature map of Vahi HMS Enterprise across patients, appointments, billing, occupancy, communications, consent, discharge, analytics, and audit control.",
  path: "/features",
  keywords: [
    "hospital software features",
    "hospital management modules",
    "billing occupancy analytics",
  ],
});

export default function FeaturesPage() {
  return <PublicMarketingPage content={marketingPages.features} />;
}
