import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { DashboardRouteSkeleton } from "@/components/layout/route-skeletons";
import { PageHeader } from "@/components/ui/page-header";
import { buildDashboardMetadata } from "@/lib/seo/metadata";

const ChargeMasterPanel = dynamic(
  () => import("@/components/billing/charge-master-panel").then((mod) => mod.ChargeMasterPanel),
  {
    loading: () => <DashboardRouteSkeleton variant="workspace" />,
  },
);

export const metadata: Metadata = buildDashboardMetadata({
  title: "Charge Master",
  description:
    "Protected billing administration route for hospital charge catalog setup, pricing control, and bulk export actions.",
  path: "/dashboard/charge-master",
});

export default function DashboardChargeMasterPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Billing administration"
        title="Charge master"
        description="Manage billable services, filter the charge directory, export pricing sets, and maintain the invoice catalog on a dedicated route."
      />
      <ChargeMasterPanel />
    </div>
  );
}
