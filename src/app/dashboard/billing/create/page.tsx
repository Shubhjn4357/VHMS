export { dashboardBillingCreateMetadata as metadata } from "@/app/dashboard/page-metadata";

import Link from "next/link";
import dynamic from "next/dynamic";

import { DashboardRouteSkeleton } from "@/components/layout/route-skeletons";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

const BillComposerPanel = dynamic(
  () => import("@/components/billing/bill-composer-panel").then((mod) => mod.BillComposerPanel),
  {
    loading: () => <DashboardRouteSkeleton variant="form" />,
  },
);

export default function DashboardBillingCreatePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Full runtime"
        title="Create invoice and draft bill"
        description="Use the dedicated billing workspace for appointment-linked invoice composition, charge selection, and offline-safe draft recovery."
        actions={
          <Link
            className={buttonVariants({ variant: "outline" })}
            href="/dashboard/billing"
          >
            Back to billing overview
          </Link>
        }
      />
      <BillComposerPanel />
    </div>
  );
}
