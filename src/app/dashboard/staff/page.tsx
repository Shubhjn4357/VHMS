import { dashboardStaffMetadata as metadata } from "@/app/dashboard/page-metadata";
import Link from "next/link";

import { StaffOperationsCenter } from "@/components/staff-access/staff-operations-center";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { listStaffAccess } from "@/lib/staff-access/service";

export { metadata };

export default async function DashboardStaffPage() {
  const workspace = await listStaffAccess();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workforce"
        title="Staff operations"
        description="Review active hospital users, approval posture, role distribution, and recent sign-in activity from a route focused on runtime staff coverage."
        actions={
          <>
            <Link className={buttonVariants({ variant: "outline" })} href="/dashboard/profile">
              Open profile
            </Link>
            <Link className={buttonVariants({ variant: "outline" })} href="/dashboard/staff-access">
              Manage staff access
            </Link>
          </>
        }
      />

      <StaffOperationsCenter
        entries={workspace.entries}
        summary={workspace.summary}
      />
    </div>
  );
}
