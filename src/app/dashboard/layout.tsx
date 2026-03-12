import type { Metadata } from "next";

import { DashboardLayoutFrame } from "@/components/layout/dashboard-layout-frame";
import { buildDashboardMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildDashboardMetadata({
  title: "Operations Dashboard",
  description:
    "Protected hospital operations dashboard for scheduling, billing, occupancy, analytics, reports, and administrative workflows.",
  path: "/dashboard",
});

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <DashboardLayoutFrame>{children}</DashboardLayoutFrame>;
}
