export { dashboardPrintTemplatesMetadata as metadata } from "@/app/dashboard/page-metadata";

import dynamic from "next/dynamic";

import { DashboardRouteSkeleton } from "@/components/layout/route-skeletons";
import { PageHeader } from "@/components/ui/page-header";

const PrintTemplateManagement = dynamic(
  () => import("@/components/print/print-template-management").then((mod) => mod.PrintTemplateManagement),
  {
    loading: () => <DashboardRouteSkeleton variant="workspace" />,
  },
);

export default function DashboardPrintTemplatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Document control"
        title="Print templates"
        description="Control section ordering and print layout behavior for A4 bills, thermal slips, discharge summaries, and consent documents."
      />
      <PrintTemplateManagement hideHeader />
    </div>
  );
}
