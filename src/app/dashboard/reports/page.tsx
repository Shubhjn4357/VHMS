export { dashboardReportsMetadata as metadata } from "@/app/dashboard/page-metadata";

import dynamic from "next/dynamic";

import { DashboardRouteSkeleton } from "@/components/layout/route-skeletons";
import { PageHeader } from "@/components/ui/page-header";

const ReportingCenter = dynamic(
  () => import("@/components/reports/reporting-center").then((mod) => mod.ReportingCenter),
  {
    loading: () => <DashboardRouteSkeleton variant="directory" />,
  },
);

export default function DashboardReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Exports"
        title="Reports"
        description="Export operational reporting across billing, occupancy, staff access, communications, and outstanding collections from the reporting center."
      />
      <ReportingCenter hideHeader />
    </div>
  );
}
