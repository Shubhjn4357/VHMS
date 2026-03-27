import type { Metadata } from "next";

import { PublicMarketingPage } from "@/components/public/public-marketing-page";
import { getHospitalBranding } from "@/lib/hospital/service";
import { marketingPages } from "@/lib/public-site/marketing-pages";
import { buildPublicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "Contact",
  description:
    "Use the Vahi Hospital OS contact page for deployment review, hospital branding context, support discussions, and rollout planning.",
  path: "/contact",
  keywords: [
    "contact hospital software vendor",
    "hospital rollout consultation",
    "HMS implementation contact",
  ],
});

export default async function ContactPage() {
  const branding = await getHospitalBranding();

  return (
    <PublicMarketingPage
      content={marketingPages.contact}
      supportCards={[
        { label: "Hospital display name", value: branding.displayName },
        { label: "Legal name", value: branding.legalName },
        { label: "Contact phone", value: branding.contactPhone ?? "Configured during rollout" },
        { label: "Contact email", value: branding.contactEmail ?? "Configured during rollout" },
        { label: "Address", value: branding.address ?? "Configured during rollout" },
      ]}
    />
  );
}
