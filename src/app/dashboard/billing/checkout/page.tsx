export { dashboardBillingCheckoutMetadata as metadata } from "@/app/dashboard/page-metadata";

import Link from "next/link";
import dynamic from "next/dynamic";

import { DashboardRouteSkeleton } from "@/components/layout/route-skeletons";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

const BillingRegisterPanel = dynamic(
  () => import("@/components/billing/billing-register-panel").then((mod) => mod.BillingRegisterPanel),
  {
    loading: () => <DashboardRouteSkeleton variant="workspace" />,
  },
);

export default function DashboardBillingCheckoutPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Full runtime"
        title="Billing checkout desk"
        description="Use the dedicated checkout route to search bills, settle payments, cancel unpaid drafts, and open print-safe output without the rest of the billing overview."
        actions={
          <Link
            className={buttonVariants({ variant: "outline" })}
            href="/dashboard/billing"
          >
            Back to billing overview
          </Link>
        }
      />
      <BillingRegisterPanel />
    </div>
  );
}
