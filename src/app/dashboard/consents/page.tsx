export { dashboardConsentsMetadata as metadata } from "@/app/dashboard/page-metadata";

import dynamic from "next/dynamic";

import { DashboardRouteSkeleton } from "@/components/layout/route-skeletons";
import { PageHeader } from "@/components/ui/page-header";

const ConsentManagement = dynamic(
  () => import("@/components/consents/consent-management").then((mod) => mod.ConsentManagement),
  {
    loading: () => <DashboardRouteSkeleton variant="workspace" />,
  },
);

export default function DashboardConsentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clinical documents"
        title="Consents"
        description="Configure consent templates, render patient-specific documents, and monitor role-based signature completion from the consent workflow route."
      />
      <ConsentManagement hideHeader />
    </div>
  );
}
