import type { Metadata } from "next";

import { PublicHome } from "@/components/public/public-home";
import { buildPublicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "Hospital Operating System",
  description:
    "Vahi Hospital OS is a direct-deploy hospital operating system for reception, appointments, OPD and IPD billing, occupancy, communication workflows, discharge, and audit-safe administration.",
  path: "/",
  keywords: [
    "hospital operating system",
    "hospital management deployment",
    "OPD IPD billing software",
    "hospital occupancy system",
  ],
});

export default function Home() {
  return <PublicHome />;
}
