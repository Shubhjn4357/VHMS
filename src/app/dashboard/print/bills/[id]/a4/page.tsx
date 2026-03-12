export { dashboardPrintBillA4Metadata as metadata } from "@/app/dashboard/page-metadata";

import { notFound } from "next/navigation";

import { A4BillDocument } from "@/components/print/a4-bill-document";
import { PrintToolbar } from "@/components/print/print-toolbar";
import {
  getBillPrintPayload,
  requirePrintPermissions,
} from "@/lib/print/service";

export default async function DashboardPrintBillA4Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pathname = `/dashboard/print/bills/${id}/a4`;
  await requirePrintPermissions(pathname, ["billing.export"]);

  const payload = await getBillPrintPayload(id, "a4Bill");

  if (!payload) {
    notFound();
  }

  return (
    <div className="print-document-page mx-auto max-w-[1200px] space-y-6 px-4 py-6">
      <PrintToolbar
        title={payload.bill.billNumber}
        subtitle="A4 billing invoice"
      />
      <A4BillDocument {...payload} />
    </div>
  );
}
