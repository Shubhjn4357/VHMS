export { dashboardBillingMetadata as metadata } from "@/app/dashboard/page-metadata";

import dynamic from "next/dynamic";

import { DashboardRouteSkeleton } from "@/components/layout/route-skeletons";
import { PageHeader } from "@/components/ui/page-header";

const BillingManagement = dynamic(
  () => import("@/components/billing/billing-management").then((mod) => mod.BillingManagement),
  {
    loading: () => <DashboardRouteSkeleton variant="workspace" />,
  },
);

export default function DashboardBillingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Revenue operations"
        title="Billing"
        description="Manage charge configuration, invoice drafting, settlement visibility, export-ready billing records, and OPD-linked revenue workflows from the main billing route."
      />
      <BillingManagement hideHeader />
    </div>
  );
}
