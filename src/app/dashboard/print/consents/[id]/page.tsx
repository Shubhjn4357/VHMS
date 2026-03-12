export { dashboardPrintConsentMetadata as metadata } from "@/app/dashboard/page-metadata";

import { notFound } from "next/navigation";

import { ConsentPrintDocument } from "@/components/print/consent-print-document";
import { PrintToolbar } from "@/components/print/print-toolbar";
import {
  getConsentPrintPayload,
  requirePrintPermissions,
} from "@/lib/print/service";

export default async function DashboardPrintConsentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pathname = `/dashboard/print/consents/${id}`;
  await requirePrintPermissions(pathname, ["consents.view"]);

  const payload = await getConsentPrintPayload(id);

  if (!payload) {
    notFound();
  }

  return (
    <div className="print-document-page mx-auto max-w-[1200px] space-y-6 px-4 py-6">
      <PrintToolbar
        title={payload.document.templateName}
        subtitle="Consent document"
      />
      <ConsentPrintDocument {...payload} />
    </div>
  );
}
