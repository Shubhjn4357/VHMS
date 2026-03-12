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
        eyebrow="Command board"
        title="Hospital operations dashboard"
        description="Use the live overview route to monitor appointments, billing, occupancy, communication load, approvals, and saved layout priorities from one operational command board."
      />
      <DashboardOverview />
    </div>
  );
}
