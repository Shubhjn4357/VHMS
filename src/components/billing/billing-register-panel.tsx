"use client";

import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Download,
  FileText,
  Loader2,
  Printer,
  Search,
  Wallet,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  startTransition,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { BILL_STATUS } from "@/constants/billStatus";
import { EmptyState } from "@/components/feedback/empty-state";
import { BulkActionToolbar } from "@/components/tables/bulk-action-toolbar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SurfaceCard } from "@/components/ui/surface-card";
import { ThemedSelect } from "@/components/ui/themed-select";
import { useBillingDirectory, useSettleBill } from "@/hooks/useBillingApi";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { apiClient } from "@/lib/api/client";
import {
  downloadCsv,
  downloadExcelHtml,
  downloadJson,
  openPrintTable,
  type ExportColumn,
} from "@/lib/export/client";
import { settleBillSchema } from "@/lib/validators/billing";
import type { BillRecord } from "@/types/billing";

type SettlementFormInput = z.input<typeof settleBillSchema>;
type SettlementFormValues = z.output<typeof settleBillSchema>;

const settlementDefaultValues: SettlementFormInput = {
  action: "FINALIZE",
  paymentReceived: 0,
};

const billStatusToneMap: Record<string, string> = {
  DRAFT: "bg-[rgba(20,32,51,0.08)] text-ink",
  PENDING: "bg-[rgba(217,119,6,0.12)] text-warning",
  PARTIALLY_PAID: "bg-[rgba(21,94,239,0.12)] text-accent",
  PAID: "bg-[rgba(21,128,61,0.12)] text-success",
  CANCELLED: "bg-[rgba(220,38,38,0.12)] text-danger",
  REFUNDED: "bg-[rgba(124,58,237,0.12)] text-[rgb(109,40,217)]",
};

const paymentStatusToneMap: Record<string, string> = {
  UNPAID: "bg-[rgba(217,119,6,0.12)] text-warning",
  PARTIALLY_PAID: "bg-[rgba(21,94,239,0.12)] text-accent",
  PAID: "bg-[rgba(21,128,61,0.12)] text-success",
  REFUNDED: "bg-[rgba(124,58,237,0.12)] text-[rgb(109,40,217)]",
};

function formatCurrency(value: number) {
  return `Rs ${value.toFixed(2)}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function canSettleBill(bill: BillRecord) {
  return ["DRAFT", "PENDING", "PARTIALLY_PAID"].includes(bill.billStatus);
}

export function BillingRegisterPanel() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") ?? "";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    (typeof BILL_STATUS)[number] | "ALL"
  >("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [selectedBill, setSelectedBill] = useState<BillRecord | null>(null);
  const deferredSearch = useDebouncedSearch(search);

  const { canAccess: canFinalizeBilling } = useModuleAccess([
    "billing.finalize",
  ]);
  const { canAccess: canExportBilling } = useModuleAccess(["billing.export"]);
  const billingQuery = useBillingDirectory({
    q: deferredSearch,
    status: statusFilter,
  });
  const settleBillMutation = useSettleBill();
  const settlementForm = useForm<
    SettlementFormInput,
    unknown,
    SettlementFormValues
  >({
    resolver: zodResolver(settleBillSchema),
    defaultValues: settlementDefaultValues,
  });

  useEffect(() => {
    setSearch(queryParam);
  }, [queryParam]);

  useEffect(() => {
    if (!selectedBill) {
      settlementForm.reset(settlementDefaultValues);
      return;
    }

    settlementForm.reset({
      action: "FINALIZE",
      paymentReceived: selectedBill.balanceAmount,
    });
  }, [selectedBill, settlementForm]);

  function prepareSettlement(entry: BillRecord) {
    startTransition(() => setSelectedBill(entry));
  }

  function clearSelection() {
    startTransition(() => setSelectedBill(null));
  }

  function handleSettlementSubmit(values: SettlementFormValues) {
    if (!selectedBill) {
      return;
    }

    settleBillMutation.mutate(
      {
        id: selectedBill.id,
        action: values.action,
        paymentReceived: values.paymentReceived,
      },
      {
        onSuccess: () => {
          clearSelection();
        },
      },
    );
  }

  function handleCancelBill(entry: BillRecord) {
    if (!window.confirm(`Cancel bill ${entry.billNumber}?`)) {
      return;
    }

    settleBillMutation.mutate({
      id: entry.id,
      action: "CANCEL",
      paymentReceived: 0,
    });
  }

  function toggleSelection(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((entryId) => entryId !== id)
        : [...current, id]
    );
  }

  function toggleAllVisible() {
    setSelectedIds((current) =>
      allVisibleSelected
        ? current.filter((id) => !entries.some((entry) => entry.id === id))
        : Array.from(new Set([...current, ...entries.map((entry) => entry.id)]))
    );
  }

  function clearBulkSelection() {
    setSelectedIds([]);
  }

  async function handleBulkCancel() {
    if (!canFinalizeBilling || selectedEntries.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Cancel ${selectedEntries.length} selected bills? Only unpaid bills will be cancelled.`,
    );

    if (!confirmed) {
      return;
    }

    setIsBulkUpdating(true);
    let updatedCount = 0;
    let failedCount = 0;

    try {
      for (const entry of selectedEntries) {
        try {
          await apiClient.patch(`/api/bills/${entry.id}`, {
            action: "CANCEL",
            paymentReceived: 0,
          });
          updatedCount += 1;
        } catch {
          failedCount += 1;
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["bills"] });
      clearBulkSelection();

      if (updatedCount > 0) {
        toast.success(`Cancelled ${updatedCount} bills.`);
      }

      if (failedCount > 0) {
        toast.error(`${failedCount} bills could not be cancelled.`);
      }
    } finally {
      setIsBulkUpdating(false);
    }
  }

  function exportSelectedBills(format: "csv" | "json" | "xls" | "print") {
    if (selectedEntries.length === 0) {
      return;
    }

    const filenameBase = `billing-register-${new Date().toISOString().slice(0, 10)}`;

    if (format === "csv") {
      downloadCsv(`${filenameBase}.csv`, selectedEntries, billExportColumns);
      return;
    }

    if (format === "json") {
      downloadJson(`${filenameBase}.json`, selectedEntries);
      return;
    }

    if (format === "xls") {
      downloadExcelHtml(
        `${filenameBase}.xls`,
        "Billing Register Export",
        selectedEntries,
        billExportColumns,
      );
      return;
    }

    openPrintTable("Billing Register Export", selectedEntries, billExportColumns);
  }

  const entries = useMemo(
    () => billingQuery.data?.entries ?? [],
    [billingQuery.data?.entries],
  );
  const selectedEntries = entries.filter((entry) => selectedIds.includes(entry.id));
  const allVisibleSelected = entries.length > 0 &&
    entries.every((entry) => selectedIds.includes(entry.id));
  const billExportColumns: ExportColumn<BillRecord>[] = [
    { key: "billNumber", label: "Bill Number", value: (entry) => entry.billNumber },
    { key: "patient", label: "Patient", value: (entry) => entry.patientName },
    {
      key: "hospitalNumber",
      label: "UHID",
      value: (entry) => entry.patientHospitalNumber,
    },
    { key: "doctor", label: "Doctor", value: (entry) => entry.doctorName },
    {
      key: "billStatus",
      label: "Bill Status",
      value: (entry) => entry.billStatus,
    },
    {
      key: "paymentStatus",
      label: "Payment Status",
      value: (entry) => entry.paymentStatus,
    },
    {
      key: "totalAmount",
      label: "Total",
      value: (entry) => formatCurrency(entry.totalAmount),
    },
    {
      key: "amountPaid",
      label: "Paid",
      value: (entry) => formatCurrency(entry.amountPaid),
    },
    {
      key: "balanceAmount",
      label: "Balance",
      value: (entry) => formatCurrency(entry.balanceAmount),
    },
    {
      key: "createdAt",
      label: "Created At",
      value: (entry) => formatDateTime(entry.createdAt),
    },
  ];

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) => entries.some((entry) => entry.id === id))
    );
  }, [entries]);

  return (
    <section className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
      <SurfaceCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Billing register
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              Drafts, pending collections, and paid bills
            </h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="glass-panel-muted flex items-center gap-3 rounded-[24px] px-4 py-3 text-sm text-muted-foreground">
              <Search className="h-4 w-4 text-brand" />
              <Input
                className="h-auto min-w-44 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search bill, patient, UHID"
                value={search}
              />
            </label>

            <ThemedSelect
              className="glass-panel-muted rounded-full py-3 font-medium"
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as (typeof BILL_STATUS)[number] | "ALL",
                )}
              value={statusFilter}
            >
              <option value="ALL">All bill states</option>
              {BILL_STATUS.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </ThemedSelect>
          </div>
        </div>

        <div className="mt-6">
          <BulkActionToolbar
            count={selectedEntries.length}
            itemLabel="bill"
            onClear={clearBulkSelection}
          >
            {canExportBilling
              ? (
                <>
                  <Button
                    onClick={() => exportSelectedBills("csv")}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Download className="h-4 w-4" />
                    CSV
                  </Button>
                  <Button
                    onClick={() => exportSelectedBills("xls")}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Download className="h-4 w-4" />
                    Excel
                  </Button>
                  <Button
                    onClick={() => exportSelectedBills("json")}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Download className="h-4 w-4" />
                    JSON
                  </Button>
                  <Button
                    onClick={() => exportSelectedBills("print")}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                </>
              )
              : null}
            {canFinalizeBilling
              ? (
                <Button
                  disabled={isBulkUpdating}
                  onClick={() => void handleBulkCancel()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {isBulkUpdating
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : null}
                  Cancel selected
                </Button>
              )
              : null}
          </BulkActionToolbar>
        </div>

        <div className="mt-6 space-y-4">
          {billingQuery.isLoading
            ? (
              <div className="glass-panel-muted flex items-center gap-3 rounded-[24px] px-4 py-5 text-sm text-ink-soft">
                <Loader2 className="h-4 w-4 animate-spin text-brand" />
                Loading bills
              </div>
            )
            : null}

          {!billingQuery.isLoading && entries.length === 0
            ? (
              <EmptyState
                description="No bills match the current filters. Create a draft bill from the composer to start the billing register."
                icon={FileText}
                title="No bills found"
              />
            )
            : null}

          {entries.map((entry) => (
            <article
              key={entry.id}
              className="glass-panel-muted rounded-[28px] p-5"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-ink-soft">
                        <Checkbox
                          checked={selectedIds.includes(entry.id)}
                          onChange={() => toggleSelection(entry.id)}
                        />
                        Select
                      </label>
                      <h3 className="text-xl font-semibold text-ink">
                        {entry.billNumber}
                      </h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                          billStatusToneMap[entry.billStatus] ??
                            "glass-chip text-ink"
                        }`}
                      >
                        {entry.billStatus.replaceAll("_", " ")}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                          paymentStatusToneMap[entry.paymentStatus] ??
                            "glass-chip text-ink"
                        }`}
                      >
                        {entry.paymentStatus.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-ink">
                      {entry.patientName} / {entry.patientHospitalNumber}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {entry.doctorName || "Doctor unavailable"}
                      {entry.doctorDepartment
                        ? ` / ${entry.doctorDepartment}`
                        : ""}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="metric-tile rounded-[20px] px-4 py-3 text-center">
                      <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">
                        Total
                      </p>
                      <p className="mt-1 text-lg font-semibold text-ink">
                        {formatCurrency(entry.totalAmount)}
                      </p>
                    </div>
                    <div className="metric-tile rounded-[20px] px-4 py-3 text-center">
                      <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">
                        Paid
                      </p>
                      <p className="mt-1 text-lg font-semibold text-ink">
                        {formatCurrency(entry.amountPaid)}
                      </p>
                    </div>
                    <div className="metric-tile rounded-[20px] px-4 py-3 text-center">
                      <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">
                        Balance
                      </p>
                      <p className="mt-1 text-lg font-semibold text-ink">
                        {formatCurrency(entry.balanceAmount)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="glass-panel rounded-[22px] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                    Line items
                  </p>
                  <div className="mt-3 space-y-2">
                    {entry.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 text-sm text-ink-soft"
                      >
                        <span>
                          {item.description} / {item.quantity} x{" "}
                          {formatCurrency(item.unitPrice)}
                        </span>
                        <span className="font-medium text-ink">
                          {formatCurrency(item.lineTotal)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-ink-soft">
                  <span>Created {formatDateTime(entry.createdAt)}</span>
                  {entry.appointmentScheduledFor
                    ? (
                      <span>
                        Appointment{" "}
                        {formatDateTime(entry.appointmentScheduledFor)}
                      </span>
                    )
                    : null}
                </div>

                {canFinalizeBilling
                  ? (
                    <div className="flex flex-wrap gap-3">
                      {canSettleBill(entry)
                        ? (
                          <Button
                            onClick={() => prepareSettlement(entry)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <Wallet className="h-4 w-4" />
                            Settle bill
                          </Button>
                        )
                        : null}

                      {entry.amountPaid === 0 &&
                          entry.billStatus !== "CANCELLED"
                        ? (
                          <Button
                            className="hover:border-destructive hover:text-destructive"
                            onClick={() => handleCancelBill(entry)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Cancel bill
                          </Button>
                        )
                        : null}
                    </div>
                  )
                  : null}
              </div>
            </article>
          ))}
        </div>

        {entries.length > 0
          ? (
            <div className="mt-4 flex justify-end">
              <label className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-2 text-sm text-ink-soft">
                <Checkbox
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                />
                Select all visible
              </label>
            </div>
          )
          : null}
      </SurfaceCard>

      <SurfaceCard>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Settlement desk
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            Finalize draft and pending bills
          </h2>
        </div>

        {!canFinalizeBilling
          ? (
            <EmptyState
              className="mt-6 min-h-56"
              description="Recording payment or moving bills out of draft requires the billing.finalize permission."
              icon={Wallet}
              title="Settlement is permission-gated"
            />
          )
          : selectedBill
          ? (
            <form
              className="mt-6 space-y-5"
              onSubmit={settlementForm.handleSubmit(handleSettlementSubmit)}
            >
              <div className="glass-panel-muted rounded-[24px] p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-semibold text-ink">
                    {selectedBill.billNumber}
                  </h3>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                      billStatusToneMap[selectedBill.billStatus] ??
                        "glass-chip text-ink"
                    }`}
                  >
                    {selectedBill.billStatus.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="mt-3 text-sm text-ink">
                  {selectedBill.patientName} /{" "}
                  {selectedBill.patientHospitalNumber}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  {selectedBill.doctorName || "Doctor unavailable"}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="metric-tile rounded-[22px] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">
                    Total
                  </p>
                  <p className="mt-2 text-lg font-semibold text-ink">
                    {formatCurrency(selectedBill.totalAmount)}
                  </p>
                </div>
                <div className="metric-tile rounded-[22px] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">
                    Paid so far
                  </p>
                  <p className="mt-2 text-lg font-semibold text-ink">
                    {formatCurrency(selectedBill.amountPaid)}
                  </p>
                </div>
                <div className="metric-tile rounded-[22px] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">
                    Balance
                  </p>
                  <p className="mt-2 text-lg font-semibold text-ink">
                    {formatCurrency(selectedBill.balanceAmount)}
                  </p>
                </div>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-ink">
                  Additional payment received
                </span>
                <Input
                  {...settlementForm.register("paymentReceived")}
                  className="mt-2"
                  min="0"
                  step="0.01"
                  type="number"
                />
                <p className="mt-2 text-sm text-danger">
                  {settlementForm.formState.errors.paymentReceived?.message}
                </p>
              </label>

              <input
                {...settlementForm.register("action")}
                type="hidden"
                value="FINALIZE"
              />

              <div className="flex flex-wrap gap-3">
                <a
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                  href={`/dashboard/print/bills/${selectedBill.id}/a4`}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Printer className="h-4 w-4" />
                  A4 print
                </a>

                <a
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                  href={`/dashboard/print/bills/${selectedBill.id}/thermal`}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Printer className="h-4 w-4" />
                  Thermal print
                </a>

                <Button
                  disabled={settleBillMutation.isPending}
                  type="submit"
                >
                  {settleBillMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Wallet className="h-4 w-4" />}
                  Record settlement
                </Button>

                <Button
                  onClick={clearSelection}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Clear selection
                </Button>
              </div>
            </form>
          )
          : (
            <EmptyState
              className="mt-6 min-h-56"
              description="Choose a draft, pending, or partially paid bill from the register to record payment and advance its status."
              icon={Wallet}
              title="No bill selected for settlement"
            />
          )}
      </SurfaceCard>
    </section>
  );
}
