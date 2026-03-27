import type { Metadata } from "next";

import { PublicMarketingPage } from "@/components/public/public-marketing-page";
import { marketingPages } from "@/lib/public-site/marketing-pages";
import { buildPublicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "Capabilities",
  description:
    "Explore the operational capability map of Vahi Hospital OS across patients, appointments, billing, occupancy, communications, consent, discharge, analytics, and audit control.",
  path: "/features",
  keywords: [
    "hospital software capabilities",
    "hospital management modules",
    "billing occupancy analytics",
  ],
});

export default function FeaturesPage() {
  return <PublicMarketingPage content={marketingPages.features} />;
}
