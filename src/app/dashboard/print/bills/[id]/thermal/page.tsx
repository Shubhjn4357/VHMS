export { dashboardPrintBillThermalMetadata as metadata } from "@/app/dashboard/page-metadata";

import { notFound } from "next/navigation";

import { PrintToolbar } from "@/components/print/print-toolbar";
import { ThermalBillDocument } from "@/components/print/thermal-bill-document";
import {
  getBillPrintPayload,
  requirePrintPermissions,
} from "@/lib/print/service";

export default async function DashboardPrintBillThermalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pathname = `/dashboard/print/bills/${id}/thermal`;
  await requirePrintPermissions(pathname, ["billing.export"]);

  const payload = await getBillPrintPayload(id, "thermalBill");

  if (!payload) {
    notFound();
  }

  return (
    <div className="print-document-page mx-auto max-w-[420px] space-y-6 px-4 py-6">
      <PrintToolbar
        title={payload.bill.billNumber}
        subtitle="Thermal billing receipt"
      />
      <ThermalBillDocument {...payload} />
    </div>
  );
}
