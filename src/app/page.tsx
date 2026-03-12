import type { Metadata } from "next";

import { PublicHome } from "@/components/public/public-home";
import { buildPublicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "Hospital Management Platform",
  description:
    "Vahi HMS Enterprise is a connected hospital operations platform for patients, appointments, OPD and IPD billing, occupancy, communications, discharge, and analytics.",
  path: "/",
  keywords: [
    "hospital management platform",
    "hospital dashboard",
    "OPD IPD billing software",
    "hospital occupancy software",
  ],
});

export default function Home() {
  return <PublicHome />;
}
