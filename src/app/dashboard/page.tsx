export { dashboardOverviewMetadata as metadata } from "@/app/dashboard/page-metadata";

import dynamic from "next/dynamic";

import { DashboardRouteSkeleton } from "@/components/layout/route-skeletons";
import { PageHeader } from "@/components/ui/page-header";

const DashboardOverview = dynamic(
  () => import("@/components/dashboard/dashboard-overview").then((mod) => mod.DashboardOverview),
  {
    loading: () => <DashboardRouteSkeleton variant="overview" />,
  },
);

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations command center"
        title="Hospital operations dashboard"
        description="Monitor front desk, billing, occupancy, communications, and approvals from one live operational board. The layout stays personalizable, but the data stays tied to real hospital activity."
      />
      <DashboardOverview />
    </div>
  );
}
