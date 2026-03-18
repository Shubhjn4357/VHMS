"use client";

import { Download, FileJson, FileSpreadsheet, Loader2, Printer, ReceiptText } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useReportsWorkspace } from "@/hooks/useReportsApi";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

type ReportingCenterProps = {
  hideHeader?: boolean;
};

export function ReportingCenter({ hideHeader = false }: ReportingCenterProps) {
  const reportsQuery = useReportsWorkspace();
  const { canAccess: canExport } = useModuleAccess(["reports.export"]);

  if (reportsQuery.isLoading) {
    return (
      <EmptyState
        className="min-h-[36rem]"
        icon={Loader2}
        title="Loading report center"
        description="Revenue, occupancy, communication, and access reports are being prepared."
      />
    );
  }

  if (reportsQuery.isError || !reportsQuery.data) {
    return (
      <EmptyState
        className="min-h-[36rem]"
        icon={ReceiptText}
        title="Reports are unavailable"
        description={reportsQuery.error instanceof Error
          ? reportsQuery.error.message
          : "The report service could not be reached."}
      />
    );
  }

  const { summary } = reportsQuery.data;

  return (
    <div className="space-y-6">
      {hideHeader
        ? null
        : (
          <PageHeader
            eyebrow="Phase 7 reporting"
            title="Operational reporting center"
            description="Doctor revenue, occupancy, staff access posture, communication reliability, and outstanding bill pressure are available from one exportable surface."
            actions={canExport
              ? (
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a href="/api/reports?format=csv">
                      <Download className="h-4 w-4" />
                      CSV
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <a href="/api/reports?format=xlsx">
                      <FileSpreadsheet className="h-4 w-4" />
                      XLSX
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <a href="/api/reports?format=pdf">
                      <ReceiptText className="h-4 w-4" />
                      PDF
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <a href="/api/reports?format=json">
                      <FileJson className="h-4 w-4" />
                      JSON
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <a
                      href="/api/reports?format=print"
                      rel="noreferrer"
                      target="_blank"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </a>
                  </Button>
                </div>
              )
              : null}
          />
        )}

      <section className="grid gap-4 xl:grid-cols-6">
        {[
          ["Revenue", formatCurrency(summary.totalRevenue)],
          ["Collected", formatCurrency(summary.amountCollected)],
          ["Outstanding", formatCurrency(summary.outstandingAmount)],
          ["Active admissions", summary.activeAdmissions],
          ["Queued messages", summary.queuedMessages],
          ["Failed messages", summary.failedMessages],
        ].map(([label, value]) => (
          <SurfaceCard key={String(label)}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {value}
            </p>
          </SurfaceCard>
        ))}
      </section>

      <section className="grid gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
        <SurfaceCard>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Revenue by doctor
          </p>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="pb-3">Doctor</th>
                  <th className="pb-3 text-right">Bills</th>
                  <th className="pb-3 text-right">Billed</th>
                  <th className="pb-3 text-right">Collected</th>
                  <th className="pb-3 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {reportsQuery.data.revenueByDoctor.map((row) => (
                  <tr key={row.doctorName} className="border-t border-line">
                    <td className="py-3 font-medium text-foreground">
                      {row.doctorName}
                    </td>
                    <td className="py-3 text-right text-muted-foreground">
                      {row.bills}
                    </td>
                    <td className="py-3 text-right text-foreground">
                      {formatCurrency(row.totalBilled)}
                    </td>
                    <td className="py-3 text-right text-primary">
                      {formatCurrency(row.amountCollected)}
                    </td>
                    <td className="py-3 text-right text-danger">
                      {formatCurrency(row.outstandingAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Outstanding bills
          </p>
          <div className="mt-5 space-y-3">
            {reportsQuery.data.outstandingBills.map((row) => (
              <div
                key={row.billId}
                className="management-subtle-card p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-foreground">{row.billNumber}</p>
                    <p className="text-sm text-muted-foreground">{row.patientName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-danger">
                      {formatCurrency(row.balanceAmount)}
                    </p>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {row.paymentStatus.replaceAll("_", " ")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <SurfaceCard>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Appointment states
          </p>
          <div className="mt-5 space-y-3">
            {reportsQuery.data.appointmentStatus.map((row) => (
              <div
                key={row.status}
                className="management-subtle-card flex items-center justify-between px-4 py-3"
              >
                <span className="text-sm font-medium text-foreground">
                  {row.status.replaceAll("_", " ")}
                </span>
                <span className="text-sm text-muted-foreground">{row.total}</span>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Communication channels
          </p>
          <div className="mt-5 space-y-3">
            {reportsQuery.data.communicationByChannel.map((row) => (
              <div
                key={row.channel}
                className="management-subtle-card px-4 py-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-foreground">
                    {row.channel.replaceAll("_", " ")}
                  </span>
                  <span className="text-sm text-muted-foreground">{row.total}</span>
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {row.delivered} delivered / {row.queued} queued / {row.failed}
                  {" "}
                  failed
                </p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Staff access posture
          </p>
          <div className="mt-5 space-y-3">
            {reportsQuery.data.staffAccessByRole.map((row) => (
              <div
                key={row.role}
                className="management-subtle-card px-4 py-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-foreground">
                    {row.role.replaceAll("_", " ")}
                  </span>
                  <span className="text-sm text-primary">
                    {row.approved} approved
                  </span>
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {row.pending} pending / {row.revoked} revoked
                </p>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </section>

      <SurfaceCard>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Occupancy by ward
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="pb-3">Ward</th>
                <th className="pb-3 text-right">Occupied</th>
                <th className="pb-3 text-right">Reserved</th>
                <th className="pb-3 text-right">Cleaning</th>
                <th className="pb-3 text-right">Blocked</th>
                <th className="pb-3 text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              {reportsQuery.data.occupancyByWard.map((row) => (
                <tr key={row.wardId} className="border-t border-line">
                  <td className="py-3 font-medium text-foreground">{row.wardName}</td>
                  <td className="py-3 text-right text-foreground">
                    {row.occupied}/{row.total}
                  </td>
                  <td className="py-3 text-right text-muted-foreground">
                    {row.reserved}
                  </td>
                  <td className="py-3 text-right text-muted-foreground">
                    {row.cleaning}
                  </td>
                  <td className="py-3 text-right text-muted-foreground">
                    {row.blocked}
                  </td>
                  <td className="py-3 text-right text-primary">
                    {formatPercent(row.occupancyRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </div>
  );
}
