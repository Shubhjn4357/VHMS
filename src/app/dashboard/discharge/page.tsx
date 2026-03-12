export { dashboardDischargeMetadata as metadata } from "@/app/dashboard/page-metadata";

import dynamic from "next/dynamic";

import { DashboardRouteSkeleton } from "@/components/layout/route-skeletons";
import { PageHeader } from "@/components/ui/page-header";

const DischargeManagement = dynamic(
  () => import("@/components/discharge/discharge-management").then((mod) => mod.DischargeManagement),
  {
    loading: () => <DashboardRouteSkeleton variant="workspace" />,
  },
);

export default function DashboardDischargePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clinical documents"
        title="Discharge"
        description="Draft, revise, finalize, and print discharge summaries against live admissions from the dedicated discharge workflow route."
      />
      <DischargeManagement hideHeader />
    </div>
  );
}
