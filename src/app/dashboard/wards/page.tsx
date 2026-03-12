export { dashboardWardsMetadata as metadata } from "@/app/dashboard/page-metadata";

import dynamic from "next/dynamic";

import { DashboardRouteSkeleton } from "@/components/layout/route-skeletons";
import { PageHeader } from "@/components/ui/page-header";

const WardManagement = dynamic(
  () => import("@/components/wards/ward-management").then((mod) => mod.WardManagement),
  {
    loading: () => <DashboardRouteSkeleton variant="workspace" />,
  },
);

export default function DashboardWardsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Facility masters"
        title="Wards and beds"
        description="Maintain wards, rooms, and bed inventory with the route dedicated to facility structure, occupancy linkage, and master-level safety controls."
      />
      <WardManagement hideHeader />
    </div>
  );
}
