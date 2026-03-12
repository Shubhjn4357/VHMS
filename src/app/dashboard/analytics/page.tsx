export { dashboardAnalyticsMetadata as metadata } from "@/app/dashboard/page-metadata";

import dynamic from "next/dynamic";

import { DashboardRouteSkeleton } from "@/components/layout/route-skeletons";
import { PageHeader } from "@/components/ui/page-header";

const AnalyticsDashboard = dynamic(
  () => import("@/components/analytics/analytics-dashboard").then((mod) => mod.AnalyticsDashboard),
  {
    loading: () => <DashboardRouteSkeleton variant="overview" />,
  },
);

export default function DashboardAnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        description="Review revenue trends, occupancy mix, delivery reliability, staffing distribution, and audit activity from the dedicated analytics route."
      />
      <AnalyticsDashboard hideHeader />
    </div>
  );
}
