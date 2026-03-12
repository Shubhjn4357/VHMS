export { dashboardCommunicationsMetadata as metadata } from "@/app/dashboard/page-metadata";

import dynamic from "next/dynamic";

import { DashboardRouteSkeleton } from "@/components/layout/route-skeletons";
import { PageHeader } from "@/components/ui/page-header";

const CommunicationManagement = dynamic(
  () => import("@/components/communications/communication-management").then((mod) => mod.CommunicationManagement),
  {
    loading: () => <DashboardRouteSkeleton variant="workspace" />,
  },
);

export default function DashboardCommunicationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Messaging"
        title="Communications"
        description="Coordinate message templates, queue retries, patient dispatches, notifications, and announcements from the main communications engine."
      />
      <CommunicationManagement hideHeader />
    </div>
  );
}
