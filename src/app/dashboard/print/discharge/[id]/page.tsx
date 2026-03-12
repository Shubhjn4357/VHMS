export { dashboardPrintDischargeMetadata as metadata } from "@/app/dashboard/page-metadata";

import { notFound } from "next/navigation";

import { DischargePrintDocument } from "@/components/print/discharge-print-document";
import { PrintToolbar } from "@/components/print/print-toolbar";
import {
  getDischargePrintPayload,
  requirePrintPermissions,
} from "@/lib/print/service";

export default async function DashboardPrintDischargePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pathname = `/dashboard/print/discharge/${id}`;
  await requirePrintPermissions(pathname, ["discharge.view"]);

  const payload = await getDischargePrintPayload(id);

  if (!payload) {
    notFound();
  }

  return (
    <div className="print-document-page mx-auto max-w-[1200px] space-y-6 px-4 py-6">
      <PrintToolbar
        title={payload.summary.patientName}
        subtitle="Discharge summary"
      />
      <DischargePrintDocument {...payload} />
    </div>
  );
}
