export { dashboardStaffAccessMetadata as metadata } from "@/app/dashboard/page-metadata";

import dynamic from "next/dynamic";

import { DashboardRouteSkeleton } from "@/components/layout/route-skeletons";
import { PageHeader } from "@/components/ui/page-header";

const StaffAccessManagement = dynamic(
  () => import("@/components/staff-access/staff-access-management").then((mod) => mod.StaffAccessManagement),
  {
    loading: () => <DashboardRouteSkeleton variant="directory" />,
  },
);

export default function StaffAccessPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Access control"
        title="Staff access"
        description="Approve invite-only identities, adjust role permissions, review login posture, and control dashboard visibility from the protected access registry."
      />
      <StaffAccessManagement />
    </div>
  );
}
