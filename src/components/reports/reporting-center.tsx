"use client";

import { useState } from "react";
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Loader2,
  Printer,
  ReceiptText,
  Search,
} from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { ROLE_LABELS } from "@/constants/roles";
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

function matchesSearch(searchValue: string, ...parts: Array<string | number>) {
  const normalized = searchValue.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return parts.some((part) => String(part).toLowerCase().includes(normalized));
}

type ReportFocus =
  | "all"
  | "finance"
  | "appointments"
  | "communications"
  | "capacity"
  | "access";

type ReportingCenterProps = {
  hideHeader?: boolean;
};

export function ReportingCenter({ hideHeader = false }: ReportingCenterProps) {
  const reportsQuery = useReportsWorkspace();
  const { canAccess: canExport } = useModuleAccess(["reports.export"]);
  const [searchValue, setSearchValue] = useState("");
  const [activeFocus, setActiveFocus] = useState<ReportFocus>("all");

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
  const filteredRevenue = reportsQuery.data.revenueByDoctor.filter((row) =>
    matchesSearch(searchValue, row.doctorName)
  );
  const filteredOutstandingBills = reportsQuery.data.outstandingBills.filter((row) =>
    matchesSearch(
      searchValue,
      row.billNumber,
      row.patientName,
      row.paymentStatus,
    )
  );
  const filteredAppointmentStatus = reportsQuery.data.appointmentStatus.filter((row) =>
    matchesSearch(searchValue, row.status)
  );
  const filteredCommunicationByChannel = reportsQuery.data.communicationByChannel.filter((row) =>
    matchesSearch(searchValue, row.channel)
  );
  const filteredCommunicationWorkflows = reportsQuery.data.communicationWorkflows.filter((row) =>
    matchesSearch(searchValue, row.label, row.workflow)
  );
  const filteredOccupancyByWard = reportsQuery.data.occupancyByWard.filter((row) =>
    matchesSearch(searchValue, row.wardName)
  );
  const filteredStaffAccessByRole = reportsQuery.data.staffAccessByRole.filter((row) =>
    matchesSearch(searchValue, ROLE_LABELS[row.role], row.role)
  );
  const focusCounts: Record<ReportFocus, number> = {
    all: filteredRevenue.length +
      filteredOutstandingBills.length +
      filteredAppointmentStatus.length +
      filteredCommunicationByChannel.length +
      filteredCommunicationWorkflows.length +
      filteredOccupancyByWard.length +
      filteredStaffAccessByRole.length,
    finance: filteredRevenue.length + filteredOutstandingBills.length,
    appointments: filteredAppointmentStatus.length,
    communications: filteredCommunicationByChannel.length +
      filteredCommunicationWorkflows.length,
    capacity: filteredOccupancyByWard.length,
    access: filteredStaffAccessByRole.length,
  };
  const focusOptions: Array<{
    description: string;
    label: string;
    value: ReportFocus;
  }> = [
    {
      value: "all",
      label: "All signals",
      description: "Full reporting center",
    },
    {
      value: "finance",
      label: "Finance",
      description: "Revenue and collections",
    },
    {
      value: "appointments",
      label: "Appointments",
      description: "Visit-state pressure",
    },
    {
      value: "communications",
      label: "Communications",
      description: "Delivery health",
    },
    {
      value: "capacity",
      label: "Capacity",
      description: "Ward occupancy",
    },
    {
      value: "access",
      label: "Access",
      description: "Role approval posture",
    },
  ];
  const topDoctor = reportsQuery.data.revenueByDoctor[0] ?? null;
  const highestOutstandingBill = reportsQuery.data.outstandingBills[0] ?? null;
  const busiestWard = [...reportsQuery.data.occupancyByWard].sort((left, right) =>
    right.occupancyRate - left.occupancyRate
  )[0] ?? null;
  const weakestChannel = [...reportsQuery.data.communicationByChannel].sort((left, right) =>
    right.failed - left.failed
  )[0] ?? null;
  const busiestWorkflow = [...reportsQuery.data.communicationWorkflows].sort((left, right) =>
    (right.messageCount + right.notificationCount) -
      (left.messageCount + left.notificationCount)
  )[0] ?? null;
  const showFinance = activeFocus === "all" || activeFocus === "finance";
  const showAppointments = activeFocus === "all" || activeFocus === "appointments";
  const showCommunications = activeFocus === "all" || activeFocus === "communications";
  const showCapacity = activeFocus === "all" || activeFocus === "capacity";
  const showAccess = activeFocus === "all" || activeFocus === "access";

  return (
    <div className="space-y-6">
      {hideHeader
        ? null
        : (
          <PageHeader
            eyebrow="Operational reporting"
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

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,0.6fr))]">
        <SurfaceCard className="xl:col-span-2">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Workspace controls
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                Focus the reporting room by operational domain before exporting
              </h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Search the live summary and switch between finance, appointment, communication,
                capacity, and access views so managers can isolate the problem area before
                downloading a report pack.
              </p>
            </div>

            <div className="w-full max-w-md">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Search report rows
              </label>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Doctor, bill, ward, channel, or role"
                  type="search"
                  value={searchValue}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {focusOptions.map((option) => (
              <Button
                className="h-auto min-w-[10rem] justify-between rounded-[var(--radius-panel)] px-4 py-3 text-left"
                key={option.value}
                onClick={() => setActiveFocus(option.value)}
                size="sm"
                type="button"
                variant={activeFocus === option.value ? "secondary" : "outline"}
              >
                <span className="flex min-w-0 flex-col items-start">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                    {option.label}
                  </span>
                  <span className="text-[11px] font-medium normal-case text-muted-foreground">
                    {option.description}
                  </span>
                </span>
                <Badge variant={activeFocus === option.value ? "secondary" : "outline"}>
                  {focusCounts[option.value]}
                </Badge>
              </Button>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Visible rows</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {focusCounts[activeFocus]}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Matching report entries inside the active workspace view.
          </p>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Collection priority</p>
          <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">
            {highestOutstandingBill
              ? highestOutstandingBill.billNumber
              : "No unpaid bills"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {highestOutstandingBill
              ? `${highestOutstandingBill.patientName} carries ${formatCurrency(highestOutstandingBill.balanceAmount)} outstanding.`
              : "Outstanding balances are cleared in the current snapshot."}
          </p>
        </SurfaceCard>
      </section>

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

      <section className="grid gap-4 xl:grid-cols-4">
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Top doctor</p>
          <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">
            {topDoctor ? topDoctor.doctorName : "No billing data"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {topDoctor
              ? `${formatCurrency(topDoctor.totalBilled)} billed across ${topDoctor.bills} invoices.`
              : "Revenue-by-doctor data is not available in this snapshot."}
          </p>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Channel watch</p>
          <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">
            {weakestChannel
              ? weakestChannel.channel.replaceAll("_", " ")
              : "No channel data"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {weakestChannel
              ? `${weakestChannel.failed} failures and ${weakestChannel.queued} queued messages need review.`
              : "Communication telemetry is not available in this snapshot."}
          </p>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Capacity watch</p>
          <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">
            {busiestWard ? busiestWard.wardName : "No occupancy data"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {busiestWard
              ? `${formatPercent(busiestWard.occupancyRate)} occupancy with ${busiestWard.occupied} of ${busiestWard.total} beds in use.`
              : "Ward occupancy detail is not available in this snapshot."}
          </p>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Workflow watch</p>
          <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">
            {busiestWorkflow ? busiestWorkflow.label : "No workflow data"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {busiestWorkflow
              ? `${busiestWorkflow.messageCount} messages and ${busiestWorkflow.notificationCount} notifications are active in the busiest communication workflow.`
              : "Reminder, discharge, and staff-notification workflow reporting is not available in this snapshot."}
          </p>
        </SurfaceCard>
      </section>

      {showFinance
        ? (
          <section className="grid gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
            <SurfaceCard>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Revenue by doctor
              </p>
              {filteredRevenue.length === 0
                ? (
                  <p className="mt-5 text-sm text-muted-foreground">
                    No doctors match the current report search.
                  </p>
                )
                : (
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
                        {filteredRevenue.map((row) => (
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
                )}
            </SurfaceCard>

            <SurfaceCard>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Outstanding bills
              </p>
              {filteredOutstandingBills.length === 0
                ? (
                  <p className="mt-5 text-sm text-muted-foreground">
                    No outstanding bills match the current report search.
                  </p>
                )
                : (
                  <div className="mt-5 space-y-3">
                    {filteredOutstandingBills.map((row) => (
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
                )}
            </SurfaceCard>
          </section>
        )
        : null}

      <section className="grid gap-6 xl:grid-cols-3">
        {showAppointments
          ? (
            <SurfaceCard>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Appointment states
              </p>
              {filteredAppointmentStatus.length === 0
                ? (
                  <p className="mt-5 text-sm text-muted-foreground">
                    No appointment states match the current report search.
                  </p>
                )
                : (
                  <div className="mt-5 space-y-3">
                    {filteredAppointmentStatus.map((row) => (
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
                )}
            </SurfaceCard>
          )
          : null}

        {showCommunications
          ? (
            <SurfaceCard>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Communication channels
              </p>
              {filteredCommunicationByChannel.length === 0
                ? (
                  <p className="mt-5 text-sm text-muted-foreground">
                    No communication rows match the current report search.
                  </p>
                )
                : (
                  <div className="mt-5 space-y-3">
                    {filteredCommunicationByChannel.map((row) => (
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
                )}
            </SurfaceCard>
          )
          : null}

        {showCommunications
          ? (
            <SurfaceCard>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Communication workflows
              </p>
              {filteredCommunicationWorkflows.length === 0
                ? (
                  <p className="mt-5 text-sm text-muted-foreground">
                    No reminder, discharge, or staff-notification workflows match the current report search.
                  </p>
                )
                : (
                  <div className="mt-5 space-y-3">
                    {filteredCommunicationWorkflows.map((row) => (
                      <div
                        key={row.workflow}
                        className="management-subtle-card px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm font-medium text-foreground">
                            {row.label}
                          </span>
                          <span className="text-sm text-primary">
                            {formatPercent(row.deliveryRate)}
                          </span>
                        </div>
                        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {row.messageCount} messages / {row.notificationCount} notifications /{" "}
                          {row.unreadNotifications} unread
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {row.delivered} delivered / {row.queued} queued / {row.failed} failed
                        </p>
                      </div>
                    ))}
                  </div>
                )}
            </SurfaceCard>
          )
          : null}

        {showAccess
          ? (
            <SurfaceCard>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Staff access posture
              </p>
              {filteredStaffAccessByRole.length === 0
                ? (
                  <p className="mt-5 text-sm text-muted-foreground">
                    No access rows match the current report search.
                  </p>
                )
                : (
                  <div className="mt-5 space-y-3">
                    {filteredStaffAccessByRole.map((row) => (
                      <div
                        key={row.role}
                        className="management-subtle-card px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm font-medium text-foreground">
                            {ROLE_LABELS[row.role]}
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
                )}
            </SurfaceCard>
          )
          : null}
      </section>

      {showCapacity
        ? (
          <SurfaceCard>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Occupancy by ward
            </p>
            {filteredOccupancyByWard.length === 0
              ? (
                <p className="mt-5 text-sm text-muted-foreground">
                  No wards match the current report search.
                </p>
              )
              : (
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
                      {filteredOccupancyByWard.map((row) => (
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
              )}
          </SurfaceCard>
        )
        : null}
    </div>
  );
}
