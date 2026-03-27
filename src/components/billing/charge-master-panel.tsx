"use client";

import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Download,
  Eye,
  Loader2,
  Plus,
  Printer,
  Search,
  Trash2,
  UserRoundPen,
  Wallet,
} from "lucide-react";
import {
  startTransition,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { CHARGE_CATEGORIES } from "@/constants/chargeCategories";
import { EmptyState } from "@/components/feedback/empty-state";
import { BulkActionToolbar } from "@/components/tables/bulk-action-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormDrawer, FormDrawerSection } from "@/components/ui/form-drawer";
import { Input } from "@/components/ui/input";
import {
  RecordPreviewDialog,
  RecordPreviewField,
  RecordPreviewSection,
} from "@/components/ui/record-preview-dialog";
import { SurfaceCard } from "@/components/ui/surface-card";
import { ThemedSelect } from "@/components/ui/themed-select";
import { useConfirmationDialog } from "@/hooks/useConfirmationDialog";
import {
  useChargeDirectory,
  useCreateCharge,
  useDeleteCharge,
  useUpdateCharge,
} from "@/hooks/useChargesApi";
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
import { createChargeSchema } from "@/lib/validators/charges";
import type { ChargeRecord } from "@/types/charge";

type ChargeFormInput = z.input<typeof createChargeSchema>;
type ChargeFormValues = z.output<typeof createChargeSchema>;

const chargeDefaultValues: ChargeFormInput = {
  categoryKey: "CONSULTATION",
  name: "",
  code: "",
  unitPrice: 0,
  taxable: false,
  active: true,
};
const chargeFormId = "charge-master-form";

function formatCategoryLabel(value: string) {
  return value.replaceAll("_", " ");
}

function formatCurrency(value: number) {
  return `Rs ${value.toFixed(2)}`;
}

export function ChargeMasterPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    (typeof CHARGE_CATEGORIES)[number] | "ALL"
  >("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">(
    "ALL",
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState<ChargeRecord | null>(
    null,
  );
  const [previewCharge, setPreviewCharge] = useState<ChargeRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const deferredSearch = useDebouncedSearch(search);

  const { canAccess: canCreateBilling } = useModuleAccess(["billing.create"]);
  const chargeQuery = useChargeDirectory({
    q: deferredSearch,
    category: categoryFilter,
    status: statusFilter,
  });
  const createChargeMutation = useCreateCharge();
  const deleteChargeMutation = useDeleteCharge();
  const updateChargeMutation = useUpdateCharge();
  const confirm = useConfirmationDialog();
  const form = useForm<ChargeFormInput, unknown, ChargeFormValues>({
    resolver: zodResolver(createChargeSchema),
    defaultValues: chargeDefaultValues,
  });

  useEffect(() => {
    if (!selectedCharge) {
      form.reset(chargeDefaultValues);
      return;
    }

    form.reset({
      categoryKey: selectedCharge.categoryKey ?? "CONSULTATION",
      name: selectedCharge.name,
      code: selectedCharge.code,
      unitPrice: selectedCharge.unitPrice,
      taxable: selectedCharge.taxable,
      active: selectedCharge.active,
    });
  }, [form, selectedCharge]);

  const filteredChargeEntries = useMemo(
    () => chargeQuery.data?.entries ?? [],
    [chargeQuery.data?.entries],
  );
  const summary = chargeQuery.data?.summary;
  const selectedEntries = filteredChargeEntries.filter((entry) =>
    selectedIds.includes(entry.id)
  );
  const allVisibleSelected = filteredChargeEntries.length > 0 &&
    filteredChargeEntries.every((entry) => selectedIds.includes(entry.id));
  const chargeExportColumns: ExportColumn<ChargeRecord>[] = [
    { key: "code", label: "Code", value: (entry) => entry.code },
    { key: "name", label: "Name", value: (entry) => entry.name },
    {
      key: "category",
      label: "Category",
      value: (entry) => entry.categoryLabel,
    },
    {
      key: "unitPrice",
      label: "Unit Price",
      value: (entry) => formatCurrency(entry.unitPrice),
    },
    {
      key: "taxable",
      label: "Taxable",
      value: (entry) => (entry.taxable ? "Yes" : "No"),
    },
    {
      key: "active",
      label: "Active",
      value: (entry) => (entry.active ? "Yes" : "No"),
    },
  ];

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) => filteredChargeEntries.some((entry) => entry.id === id))
    );
  }, [filteredChargeEntries]);

  function beginEditing(entry: ChargeRecord) {
    startTransition(() => setSelectedCharge(entry));
    setIsDrawerOpen(true);
  }

  function clearSelection() {
    startTransition(() => setSelectedCharge(null));
    setIsDrawerOpen(false);
  }

  function openPreview(entry: ChargeRecord) {
    startTransition(() => setPreviewCharge(entry));
  }

  function closePreview() {
    startTransition(() => setPreviewCharge(null));
  }

  async function handleDelete(entry: ChargeRecord) {
    const confirmed = await confirm({
      title: "Delete charge?",
      description:
        `Delete ${entry.name}? Charges already used in bills cannot be deleted.`,
      confirmLabel: "Delete charge",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    deleteChargeMutation.mutate(
      { id: entry.id },
      {
        onSuccess: () => {
          if (selectedCharge?.id === entry.id) {
            clearSelection();
          }
        },
      },
    );
  }

  function handleSubmit(values: ChargeFormValues) {
    if (selectedCharge) {
      updateChargeMutation.mutate(
        {
          id: selectedCharge.id,
          ...values,
        },
        {
          onSuccess: () => {
            clearSelection();
          },
        },
      );
      return;
    }

    createChargeMutation.mutate(values, {
      onSuccess: () => {
        form.reset(chargeDefaultValues);
      },
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
        ? current.filter((id) =>
          !filteredChargeEntries.some((entry) => entry.id === id)
        )
        : Array.from(
          new Set([...current, ...filteredChargeEntries.map((entry) => entry.id)]),
        )
    );
  }

  function clearBulkSelection() {
    setSelectedIds([]);
  }

  async function handleBulkActiveUpdate(active: boolean) {
    if (!canCreateBilling || selectedEntries.length === 0) {
      return;
    }

    setIsBulkUpdating(true);
    let updatedCount = 0;
    let failedCount = 0;

    try {
      for (const entry of selectedEntries) {
        try {
          await apiClient.patch(`/api/charges/${entry.id}`, { active });
          updatedCount += 1;
        } catch {
          failedCount += 1;
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["charges"] });
      clearBulkSelection();
      if (updatedCount > 0) {
        toast.success(`${updatedCount} charges updated.`);
      }
      if (failedCount > 0) {
        toast.error(`${failedCount} charges could not be updated.`);
      }
    } finally {
      setIsBulkUpdating(false);
    }
  }

  async function handleBulkDelete() {
    if (!canCreateBilling || selectedEntries.length === 0) {
      return;
    }

    const confirmed = await confirm({
      title: "Delete selected charges?",
      description:
        `Delete ${selectedEntries.length} selected charges? Charges already used in bills will be skipped.`,
      confirmLabel: "Delete selected",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    setIsBulkUpdating(true);
    let deletedCount = 0;
    let failedCount = 0;

    try {
      for (const entry of selectedEntries) {
        try {
          await apiClient.delete(`/api/charges/${entry.id}`);
          deletedCount += 1;
        } catch {
          failedCount += 1;
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["charges"] });
      clearBulkSelection();
      if (deletedCount > 0) {
        toast.success(`Deleted ${deletedCount} charges.`);
      }
      if (failedCount > 0) {
        toast.error(`${failedCount} charges could not be deleted.`);
      }
    } finally {
      setIsBulkUpdating(false);
    }
  }

  function exportSelectedCharges(format: "csv" | "json" | "xls" | "print") {
    if (selectedEntries.length === 0) {
      return;
    }

    const filenameBase = `charges-${new Date().toISOString().slice(0, 10)}`;

    if (format === "csv") {
      downloadCsv(`${filenameBase}.csv`, selectedEntries, chargeExportColumns);
      return;
    }

    if (format === "json") {
      downloadJson(`${filenameBase}.json`, selectedEntries);
      return;
    }

    if (format === "xls") {
      downloadExcelHtml(
        `${filenameBase}.xls`,
        "Charge Master Export",
        selectedEntries,
        chargeExportColumns,
      );
      return;
    }

    openPrintTable("Charge Master Export", selectedEntries, chargeExportColumns);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-4">
        {[
          ["Charge items", summary?.total ?? 0, "Reusable billing rows"],
          ["Active", summary?.active ?? 0, "Available in billing composer"],
          ["Inactive", summary?.inactive ?? 0, "Hidden but preserved"],
          ["Taxable", summary?.taxable ?? 0, "Rows included in tax logic"],
        ].map(([label, value, detail]) => (
          <SurfaceCard key={String(label)}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {value}
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{detail}</p>
          </SurfaceCard>
        ))}
      </section>

      <RecordPreviewDialog
        actions={canCreateBilling && previewCharge
          ? (
            <Button
              onClick={() => {
                closePreview();
                beginEditing(previewCharge);
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <UserRoundPen className="h-4 w-4" />
              Edit charge
            </Button>
          )
          : null}
        description="Review billing semantics before activating, deactivating, or re-pricing a charge."
        eyebrow="Charge profile"
        onOpenChange={(open) => {
          if (!open) {
            closePreview();
          }
        }}
        open={Boolean(previewCharge)}
        status={previewCharge
          ? (
            <Badge variant={previewCharge.active ? "success" : "secondary"}>
              {previewCharge.active ? "Active in composer" : "Inactive"}
            </Badge>
          )
          : null}
        title={previewCharge?.name ?? "Charge profile"}
      >
        {previewCharge ? (
          <>
            <RecordPreviewSection
              description="Core billing identifiers used in charge selection, invoice printing, and reports."
              icon={Wallet}
              title="Charge definition"
            >
              <RecordPreviewField label="Code" value={previewCharge.code} />
              <RecordPreviewField label="Category" value={previewCharge.categoryLabel || "Not assigned"} />
              <RecordPreviewField label="Unit price" value={formatCurrency(previewCharge.unitPrice)} />
              <RecordPreviewField label="Taxable" value={previewCharge.taxable ? "Yes" : "No"} />
            </RecordPreviewSection>
          </>
        ) : null}
      </RecordPreviewDialog>

      <SurfaceCard>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Charge management
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              Charge master catalog
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              Manage consults, investigations, and services used in billing.
            </p>
          </div>
          {canCreateBilling
            ? (
              <Button onClick={() => { clearSelection(); setIsDrawerOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Create charge
              </Button>
            )
            : null}
        </div>
      </SurfaceCard>

      <FormDrawer
        contentClassName="pb-0"
        description={selectedCharge
          ? "Update billing behavior for this charge item without leaving the master catalog."
          : "Define a reusable billing item for consultation, services, investigations, or room-related charging."}
        footer={canCreateBilling
          ? (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="management-selection-pill px-4 py-3 text-sm leading-6 text-muted-foreground">
                Changes here affect future billing composition but preserve historic bills that already used the charge.
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                {selectedCharge
                  ? (
                    <Button
                      onClick={() => handleDelete(selectedCharge)}
                      size="sm"
                      type="button"
                      variant="destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete charge
                    </Button>
                  )
                  : null}
                <Button
                  onClick={clearSelection}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {selectedCharge ? "Cancel edit" : "Close"}
                </Button>
                <Button
                  disabled={createChargeMutation.isPending ||
                    updateChargeMutation.isPending}
                  form={chargeFormId}
                  type="submit"
                >
                  {createChargeMutation.isPending ||
                      updateChargeMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : selectedCharge
                    ? <UserRoundPen className="h-4 w-4 mr-2" />
                    : <Plus className="h-4 w-4 mr-2" />}
                  {selectedCharge ? "Save charge" : "Create charge"}
                </Button>
              </div>
            </div>
          )
          : null}
        mode={selectedCharge ? "edit" : "create"}
        onOpenChange={(open) => {
          setIsDrawerOpen(open);
          if (!open) clearSelection();
        }}
        open={isDrawerOpen}
        statusLabel={selectedCharge?.code}
        title={selectedCharge ? "Edit charge" : "Create new charge"}
      >
        {canCreateBilling
          ? (
            <form
              className="space-y-5"
              id={chargeFormId}
              onSubmit={form.handleSubmit(handleSubmit)}
            >
              <FormDrawerSection
                description="Classify the charge so billing, reports, and exports can reuse a consistent financial structure."
                title="Charge definition"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Category</span>
                    <ThemedSelect
                      {...form.register("categoryKey")}
                      className="mt-2"
                    >
                      {CHARGE_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {formatCategoryLabel(category)}
                        </option>
                      ))}
                    </ThemedSelect>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-ink">Code</span>
                    <Input
                      {...form.register("code")}
                      className="mt-2 uppercase"
                      placeholder="LAB-ECG-001"
                    />
                    <p className="mt-2 text-sm text-danger">
                      {form.formState.errors.code?.message}
                    </p>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-[1.5fr_0.5fr]">
                  <label className="block">
                    <span className="text-sm font-medium text-ink">
                      Charge name
                    </span>
                    <Input
                      {...form.register("name")}
                      className="mt-2"
                      placeholder="ECG Investigation"
                    />
                    <p className="mt-2 text-sm text-danger">
                      {form.formState.errors.name?.message}
                    </p>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-ink">
                      Unit price
                    </span>
                    <Input
                      {...form.register("unitPrice")}
                      className="mt-2"
                      min="0"
                      step="0.01"
                      type="number"
                    />
                    <p className="mt-2 text-sm text-danger">
                      {form.formState.errors.unitPrice?.message}
                    </p>
                  </label>
                </div>
              </FormDrawerSection>

              <FormDrawerSection
                description="Control whether the item is taxable and whether it remains selectable in the billing composer."
                title="Commercial behavior"
              >
                <div className="flex flex-wrap gap-4">
                  <label className="management-selection-pill inline-flex items-center gap-3 px-4 py-3 text-sm text-foreground">
                    <Checkbox
                      {...form.register("taxable")}
                    />
                    Taxable
                  </label>

                  <label className="management-selection-pill inline-flex items-center gap-3 px-4 py-3 text-sm text-foreground">
                    <Checkbox
                      {...form.register("active")}
                    />
                    Active in billing composer
                  </label>
                </div>
              </FormDrawerSection>
            </form>
          )
          : (
            <EmptyState
              className="min-h-56"
              description="Managing charge master entries requires the billing.create permission."
              icon={Wallet}
              title="Charge master is read-only"
            />
          )}
      </FormDrawer>

      <SurfaceCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Charge directory
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              Active and inactive charge items
            </h2>
          </div>

          <label className="management-search-shell">
            <Search className="h-4 w-4 text-brand" />
            <Input
              className="h-auto min-w-44 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search charge, code, category"
              value={search}
            />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <ThemedSelect
              className="rounded-full py-3 font-medium"
              onChange={(event) =>
                setCategoryFilter(
                  event.target.value as (typeof CHARGE_CATEGORIES)[number] | "ALL",
                )}
              value={categoryFilter}
            >
              <option value="ALL">All categories</option>
              {CHARGE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {formatCategoryLabel(category)}
                </option>
              ))}
            </ThemedSelect>

            <ThemedSelect
              className="rounded-full py-3 font-medium"
              onChange={(event) =>
                setStatusFilter(event.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
              value={statusFilter}
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active only</option>
              <option value="INACTIVE">Inactive only</option>
            </ThemedSelect>
          </div>
        </div>

        <div className="mt-6">
          <BulkActionToolbar
            count={selectedEntries.length}
            itemLabel="charge"
            onClear={clearBulkSelection}
          >
            <Button
              onClick={() => exportSelectedCharges("csv")}
              size="sm"
              type="button"
              variant="outline"
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button
              onClick={() => exportSelectedCharges("xls")}
              size="sm"
              type="button"
              variant="outline"
            >
              <Download className="h-4 w-4" />
              Excel
            </Button>
            <Button
              onClick={() => exportSelectedCharges("json")}
              size="sm"
              type="button"
              variant="outline"
            >
              <Download className="h-4 w-4" />
              JSON
            </Button>
            <Button
              onClick={() => exportSelectedCharges("print")}
              size="sm"
              type="button"
              variant="outline"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            {canCreateBilling
              ? (
                <>
                  <Button
                    disabled={isBulkUpdating}
                    onClick={() => void handleBulkActiveUpdate(true)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Activate
                  </Button>
                  <Button
                    disabled={isBulkUpdating}
                    onClick={() => void handleBulkActiveUpdate(false)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Deactivate
                  </Button>
                  <Button
                    disabled={isBulkUpdating}
                    onClick={() => void handleBulkDelete()}
                    size="sm"
                    type="button"
                    variant="destructive"
                  >
                    {isBulkUpdating
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Trash2 className="h-4 w-4" />}
                    Delete selected
                  </Button>
                </>
              )
              : null}
          </BulkActionToolbar>
        </div>

        <div className="mt-6 space-y-3">
          {chargeQuery.isLoading
            ? (
              <div className="management-subtle-card flex items-center gap-3 px-4 py-5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-brand" />
                Loading charge master
              </div>
            )
            : null}

          {!chargeQuery.isLoading && filteredChargeEntries.length === 0
            ? (
              <EmptyState
                description="No charges match the current search. Create consultation, investigation, or service rows to make billing reusable."
                icon={Wallet}
                title="No charges found"
              />
            )
            : null}

          {filteredChargeEntries.map((entry) => (
            <article
              key={entry.id}
                className="management-subtle-card p-4"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-ink-soft">
                      <Checkbox
                        checked={selectedIds.includes(entry.id)}
                        onChange={() => toggleSelection(entry.id)}
                      />
                      Select
                    </label>
                    <h3 className="text-lg font-semibold text-ink">
                      {entry.name}
                    </h3>
                    <span className="management-selection-pill px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                      {entry.code}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                        entry.active
                          ? "status-pill-success"
                          : "status-pill-neutral text-muted-foreground"
                      }`}
                    >
                      {entry.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-ink-soft">
                    {entry.categoryLabel || "Category missing"}
                    {entry.taxable ? " / Taxable" : " / Non-taxable"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="management-selection-pill px-3 py-2 text-sm font-medium text-foreground">
                    {formatCurrency(entry.unitPrice)}
                  </span>
                  <Button
                    onClick={() => openPreview(entry)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                  {canCreateBilling
                    ? (
                      <>
                        <Button
                          onClick={() => beginEditing(entry)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <UserRoundPen className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          disabled={deleteChargeMutation.isPending}
                          onClick={() => handleDelete(entry)}
                          size="sm"
                          type="button"
                          variant="destructive"
                        >
                          {deleteChargeMutation.isPending
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />}
                          Delete
                        </Button>
                      </>
                    )
                    : null}
                </div>
              </div>
            </article>
          ))}
        </div>

        {filteredChargeEntries.length > 0
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
    </div>
  );
}
