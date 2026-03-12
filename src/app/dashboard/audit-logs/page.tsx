export { dashboardAuditLogsMetadata as metadata } from "@/app/dashboard/page-metadata";

import dynamic from "next/dynamic";

import { DashboardRouteSkeleton } from "@/components/layout/route-skeletons";
import { PageHeader } from "@/components/ui/page-header";

const AuditLogViewer = dynamic(
  () => import("@/components/audit/audit-log-viewer").then((mod) => mod.AuditLogViewer),
  {
    loading: () => <DashboardRouteSkeleton variant="directory" />,
  },
);

export default function DashboardAuditLogsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governance"
        title="Audit logs"
        description="Search the operational event trail for sensitive actions, login results, permission changes, and administrative mutations from one route."
      />
      <AuditLogViewer hideHeader />
    </div>
  );
}
