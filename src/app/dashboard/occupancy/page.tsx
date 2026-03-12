export { dashboardOccupancyMetadata as metadata } from "@/app/dashboard/page-metadata";

import dynamic from "next/dynamic";

import { DashboardRouteSkeleton } from "@/components/layout/route-skeletons";
import { PageHeader } from "@/components/ui/page-header";

const OccupancyManagement = dynamic(
  () => import("@/components/occupancy/occupancy-management").then((mod) => mod.OccupancyManagement),
  {
    loading: () => <DashboardRouteSkeleton variant="workspace" />,
  },
);

export default function DashboardOccupancyPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="IPD live board"
        title="Occupancy"
        description="Handle admissions, transfers, discharge handoff, bed status changes, and ward-wide live utilization from the dedicated occupancy board."
      />
      <OccupancyManagement hideHeader />
    </div>
  );
}
