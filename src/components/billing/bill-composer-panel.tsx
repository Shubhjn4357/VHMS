"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  FileText,
  Loader2,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  Wallet,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { EmptyState } from "@/components/feedback/empty-state";
import { OfflineDraftPanel } from "@/components/pwa/offline-draft-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SurfaceCard } from "@/components/ui/surface-card";
import { ThemedSelect } from "@/components/ui/themed-select";
import { useAppointmentDirectory } from "@/hooks/useAppointmentsApi";
import { useCreateBill } from "@/hooks/useBillingApi";
import { useChargeDirectory } from "@/hooks/useChargesApi";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { cn } from "@/lib/utils/cn";
import { createBillSchema } from "@/lib/validators/billing";
import { useOfflineStore } from "@/stores/offline-store";

type BillFormInput = z.input<typeof createBillSchema>;
type BillFormValues = z.output<typeof createBillSchema>;
type AdjustmentMode = "amount" | "percentage";
type BillDraftValues = {
  appointmentId: string;
  discountAmount: number;
  discountInput: string;
  discountMode: AdjustmentMode;
  taxAmount: number;
  taxInput: string;
  taxMode: AdjustmentMode;
  items: Array<{
    chargeId: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
};
type BillDraftFormState = {
  appointmentId?: string;
  discountAmount?: number | string;
  discountInput?: string;
  discountMode?: AdjustmentMode;
  taxAmount?: number | string;
  taxInput?: string;
  taxMode?: AdjustmentMode;
  items?: Array<{
    chargeId?: string | null;
    description?: string;
    quantity?: number | string;
    unitPrice?: number | string;
  }>;
};

const billDefaultValues: BillFormInput = {
  appointmentId: "",
  discountAmount: 0,
  taxAmount: 0,
  items: [],
};

const billDefaultDraftValues: BillDraftValues = {
  appointmentId: "",
  discountAmount: 0,
  discountInput: "0",
  discountMode: "amount",
  taxAmount: 0,
  taxInput: "0",
  taxMode: "amount",
  items: [],
};

const defaultBillFormValuesJson = JSON.stringify(billDefaultDraftValues);

function formatCurrency(value: number) {
  return `Rs ${value.toFixed(2)}`;
}

function parseAdjustmentInput(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
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

function hasSameBillItems(
  left: BillFormValues["items"],
  right: BillFormValues["items"],
) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((item, index) => {
    const nextItem = right[index];

    return item.chargeId === (nextItem?.chargeId ?? null) &&
      item.description === (nextItem?.description ?? "") &&
      Number(item.quantity ?? 0) === Number(nextItem?.quantity ?? 0) &&
      Number(item.unitPrice ?? 0) === Number(nextItem?.unitPrice ?? 0);
  });
}

function consultationDescriptionForDoctor(doctorName: string) {
  const normalizedDoctorName = doctorName.trim();
  return normalizedDoctorName
    ? `${normalizedDoctorName} consultation`
    : "Consultation";
}

function normalizeDraftItems(
  items:
    | BillDraftFormState["items"]
    | BillFormInput["items"]
    | BillFormValues["items"]
    | undefined,
): BillDraftValues["items"] {
  return (items ?? []).map((item) => ({
    chargeId: item?.chargeId ?? null,
    description: item?.description ?? "",
    quantity: Number(item?.quantity ?? 0),
    unitPrice: Number(item?.unitPrice ?? 0),
  }));
}

function extractManualBillItems(items: BillDraftValues["items"]) {
  return items.filter((item, index) => !(index === 0 && item.chargeId === null));
}

function buildAppointmentBillItems(input: {
  appointmentId: string;
  consultationFee: number;
  currentItems: BillDraftValues["items"];
  doctorName: string;
}): BillFormValues["items"] {
  if (!input.appointmentId) {
    return [];
  }

  const manualItems = extractManualBillItems(input.currentItems);

  if (input.consultationFee <= 0) {
    return manualItems;
  }

  return [
    {
      chargeId: null,
      description: consultationDescriptionForDoctor(input.doctorName),
      quantity: 1,
      unitPrice: input.consultationFee,
    },
    ...manualItems,
  ];
}

export function BillComposerPanel() {
  const searchParams = useSearchParams();
  const appointmentParam = searchParams.get("appointmentId") ?? "";
  const { canAccess: canCreateBilling } = useModuleAccess(["billing.create"]);
  const appointmentQuery = useAppointmentDirectory();
  const chargeQuery = useChargeDirectory();
  const createBillMutation = useCreateBill();
  const {
    clearDraft,
    drafts,
    enqueueAction,
    hydrated,
    isOnline,
    saveDraft,
  } = useOfflineQueue();
  const cachedAppointmentEntries = useOfflineStore((state) =>
    state.lookupCache.appointments
  );
  const cachedChargeEntries = useOfflineStore((state) => state.lookupCache.charges);
  const setLookupEntries = useOfflineStore((state) => state.setLookupEntries);
  const [chargeSearch, setChargeSearch] = useState("");
  const [discountMode, setDiscountMode] = useState<AdjustmentMode>("amount");
  const [discountInput, setDiscountInput] = useState("0");
  const [taxMode, setTaxMode] = useState<AdjustmentMode>("amount");
  const [taxInput, setTaxInput] = useState("0");
  const deferredChargeSearch = useDeferredValue(chargeSearch);
  const form = useForm<BillFormInput, unknown, BillFormValues>({
    resolver: zodResolver(createBillSchema),
    defaultValues: billDefaultValues,
  });
  const {
    fields: lineItemFields,
    append: appendLineItem,
    remove: removeLineItem,
    replace: replaceLineItems,
  } = useFieldArray({
    control: form.control,
    name: "items",
  });
  const skipAppointmentSyncRef = useRef(false);
  const watchedDraftValues = useWatch({
    control: form.control,
  }) as BillDraftFormState;
  const normalizedBillDraftValues: BillDraftValues = {
    appointmentId: watchedDraftValues?.appointmentId ?? "",
    discountAmount: Number(watchedDraftValues?.discountAmount ?? 0),
    discountInput,
    discountMode,
    taxAmount: Number(watchedDraftValues?.taxAmount ?? 0),
    taxInput,
    taxMode,
    items: normalizeDraftItems(watchedDraftValues?.items),
  };
  const billDraftPayloadJson = JSON.stringify(normalizedBillDraftValues);

  const watchedAppointmentId = useWatch({
    control: form.control,
    name: "appointmentId",
    defaultValue: billDefaultValues.appointmentId,
  });
  const watchedItems = useWatch({
    control: form.control,
    name: "items",
    defaultValue: billDefaultValues.items,
  }) as BillFormValues["items"];
  const normalizedWatchedItems = normalizeDraftItems(watchedItems);

  const appointmentEntries = appointmentQuery.data?.entries?.length
    ? appointmentQuery.data.entries
    : cachedAppointmentEntries;
  const activeChargeEntries = (
    chargeQuery.data?.entries?.length ? chargeQuery.data.entries : cachedChargeEntries
  ).filter(
    (entry) => entry.active,
  );
  const selectedAppointment = appointmentEntries.find(
    (entry) => entry.id === watchedAppointmentId,
  );
  const selectedAppointmentId = selectedAppointment?.id ?? "";
  const selectedAppointmentConsultationFee =
    selectedAppointment?.doctorConsultationFee ?? 0;
  const filteredChargeEntries = activeChargeEntries.filter((entry) => {
    const query = deferredChargeSearch.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return [
      entry.name,
      entry.code,
      entry.categoryLabel ?? "",
    ].some((value) => value.toLowerCase().includes(query));
  });

  function syncAppointmentBillItems(nextAppointmentId: string) {
    if (skipAppointmentSyncRef.current) {
      skipAppointmentSyncRef.current = false;
      return;
    }

    const currentItems = normalizeDraftItems(form.getValues("items"));

    if (!nextAppointmentId) {
      if (currentItems.length > 0) {
        replaceLineItems([]);
      }
      return;
    }

    const nextAppointment = appointmentEntries.find((entry) =>
      entry.id === nextAppointmentId
    );
    const nextItems = buildAppointmentBillItems({
      appointmentId: nextAppointmentId,
      consultationFee: nextAppointment?.doctorConsultationFee ?? 0,
      currentItems,
      doctorName: nextAppointment?.doctorName ?? "",
    });

    if (!hasSameBillItems(currentItems, nextItems)) {
      replaceLineItems(nextItems as BillFormInput["items"]);
    }
  }

  useEffect(() => {
    if (!appointmentParam) {
      return;
    }

    if (!appointmentEntries.some((entry) => entry.id === appointmentParam)) {
      return;
    }

    form.setValue("appointmentId", appointmentParam, {
      shouldDirty: true,
      shouldValidate: true,
    });

    const currentItems = normalizeDraftItems(form.getValues("items"));
    const nextAppointment = appointmentEntries.find((entry) =>
      entry.id === appointmentParam
    );
    const nextItems = buildAppointmentBillItems({
      appointmentId: appointmentParam,
      consultationFee: nextAppointment?.doctorConsultationFee ?? 0,
      currentItems,
      doctorName: nextAppointment?.doctorName ?? "",
    });

    if (!hasSameBillItems(currentItems, nextItems)) {
      replaceLineItems(nextItems as BillFormInput["items"]);
    }
  }, [appointmentEntries, appointmentParam, form, replaceLineItems]);

  useEffect(() => {
    const liveAppointmentEntries = appointmentQuery.data?.entries ?? [];

    if (liveAppointmentEntries.length === 0) {
      return;
    }

    setLookupEntries("appointments", liveAppointmentEntries);
  }, [
    appointmentQuery.data?.entries,
    appointmentQuery.dataUpdatedAt,
    setLookupEntries,
  ]);

  useEffect(() => {
    const liveChargeEntries = chargeQuery.data?.entries ?? [];

    if (liveChargeEntries.length === 0) {
      return;
    }

    setLookupEntries("charges", liveChargeEntries);
  }, [chargeQuery.data?.entries, chargeQuery.dataUpdatedAt, setLookupEntries]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (billDraftPayloadJson === defaultBillFormValuesJson) {
      return;
    }

    saveDraft({
      key: "billComposer",
      label: "Bill composer",
      payload: JSON.parse(billDraftPayloadJson) as BillDraftValues,
    });
  }, [billDraftPayloadJson, hydrated, saveDraft]);

  function resetComposerForm() {
    form.reset(billDefaultValues);
    replaceLineItems([]);
    setDiscountMode("amount");
    setDiscountInput("0");
    setTaxMode("amount");
    setTaxInput("0");
  }

  function addChargeToBill(chargeId: string) {
    if (!selectedAppointment) {
      toast.error("Select an appointment before adding charge lines.");
      return;
    }

    const selectedCharge = activeChargeEntries.find((entry) =>
      entry.id === chargeId
    );
    if (!selectedCharge) {
      return;
    }

    const existingIndex = normalizedWatchedItems.findIndex((item) =>
      item.chargeId === chargeId
    );
    if (existingIndex >= 0) {
      const currentQuantity = Number(
        normalizedWatchedItems[existingIndex]?.quantity ?? 0,
      );
      form.setValue(`items.${existingIndex}.quantity`, currentQuantity + 1, {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }

    appendLineItem({
      chargeId: selectedCharge.id,
      description: selectedCharge.name,
      quantity: 1,
      unitPrice: selectedCharge.unitPrice,
    });
  }

  function restoreDraft() {
    const savedDraft = drafts.billComposer;

    if (!savedDraft) {
      return;
    }

    const savedPayload = savedDraft.payload as BillDraftValues;

    skipAppointmentSyncRef.current = true;
    setDiscountMode(savedPayload.discountMode ?? "amount");
    setDiscountInput(
      savedPayload.discountInput ?? String(savedPayload.discountAmount ?? 0),
    );
    setTaxMode(savedPayload.taxMode ?? "amount");
    setTaxInput(savedPayload.taxInput ?? String(savedPayload.taxAmount ?? 0));
    form.reset({
      appointmentId: savedPayload.appointmentId ?? "",
      discountAmount: Number(savedPayload.discountAmount ?? 0),
      taxAmount: Number(savedPayload.taxAmount ?? 0),
      items: savedPayload.items ?? [],
    });
    replaceLineItems(savedPayload.items ?? []);
    toast.success("Bill draft restored.");
  }

  function discardDraft() {
    clearDraft("billComposer");
    resetComposerForm();
    toast.success("Bill draft removed.");
  }

  function clearComposer() {
    clearDraft("billComposer");
    resetComposerForm();
    toast.success("Invoice form cleared.");
  }

  function handleSubmit(values: BillFormValues) {
    if (!isOnline) {
      enqueueAction({
        label: `Draft bill for ${selectedAppointment?.patientName ?? "patient"}`,
        payload: values,
        type: "bills.createDraft",
        url: "/api/bills",
      });
      clearDraft("billComposer");
      resetComposerForm();
      toast.success("Draft bill queued for sync.");
      return;
    }

    createBillMutation.mutate(values, {
      onSuccess: () => {
        clearDraft("billComposer");
        resetComposerForm();
      },
    });
  }

  const subtotal = normalizedWatchedItems.reduce((sum, item) => {
    const quantity = Number(item.quantity ?? 0);
    const unitPrice = Number(item.unitPrice ?? 0);
    return sum + quantity * unitPrice;
  }, 0);
  const discountEntryValue = parseAdjustmentInput(discountInput);
  const effectiveDiscountAmount = roundCurrency(
    discountMode === "percentage"
      ? subtotal * (discountEntryValue / 100)
      : discountEntryValue,
  );
  const taxableBase = Math.max(0, subtotal - effectiveDiscountAmount);
  const taxEntryValue = parseAdjustmentInput(taxInput);
  const effectiveTaxAmount = roundCurrency(
    taxMode === "percentage" ? taxableBase * (taxEntryValue / 100) : taxEntryValue,
  );
  const totalAmount = Math.max(
    0,
    taxableBase + effectiveTaxAmount,
  );
  const usingCachedLookups = (!appointmentQuery.data?.entries?.length &&
    cachedAppointmentEntries.length > 0) ||
    (!chargeQuery.data?.entries?.length && cachedChargeEntries.length > 0);
  const invoiceLineCount = lineItemFields.length;
  const optionalChargeCount = normalizedWatchedItems.filter((item, index) =>
    !(index === 0 && item.chargeId === null && selectedAppointmentId)
  ).length;

  useEffect(() => {
    const nextDiscountAmount = roundCurrency(effectiveDiscountAmount);
    const nextTaxAmount = roundCurrency(effectiveTaxAmount);
    const currentDiscountAmount = Number(form.getValues("discountAmount") ?? 0);
    const currentTaxAmount = Number(form.getValues("taxAmount") ?? 0);

    if (currentDiscountAmount !== nextDiscountAmount) {
      form.setValue("discountAmount", nextDiscountAmount, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    if (currentTaxAmount !== nextTaxAmount) {
      form.setValue("taxAmount", nextTaxAmount, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [effectiveDiscountAmount, effectiveTaxAmount, form]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-4">
        {[
          [
            "Appointment",
            selectedAppointment ? selectedAppointment.patientName : "Select case",
            selectedAppointment
              ? selectedAppointment.patientHospitalNumber
              : "Bind this invoice to a scheduled OPD visit",
          ],
          [
            "Catalog",
            `${filteredChargeEntries.length}/${activeChargeEntries.length}`,
            "Visible active charge lines ready to add",
          ],
          [
            "Invoice lines",
            String(invoiceLineCount),
            `${optionalChargeCount} optional charge${optionalChargeCount === 1 ? "" : "s"} attached`,
          ],
          [
            "Grand total",
            formatCurrency(totalAmount),
            isOnline ? "Live draft creation" : "Offline-safe queue mode",
          ],
        ].map(([label, value, detail]) => (
          <SurfaceCard key={String(label)}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              {value}
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{detail}</p>
          </SurfaceCard>
        ))}
      </section>

      <SurfaceCard className="overflow-hidden">
        <div className="border-b border-border/70 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Billing workstation
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                Compose a patient invoice from live appointment context
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Pick the booked visit, load the consultation baseline, add optional services from the charge master, and save the invoice as a draft without leaving the billing desk.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={isOnline ? "success" : "warning"}>
                {isOnline ? "Online billing" : "Offline queue mode"}
              </Badge>
              <Button onClick={clearComposer} size="sm" type="button" variant="outline">
                Clear invoice
              </Button>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
            {canCreateBilling
              ? (
                <form
                  className="space-y-5"
                  onSubmit={form.handleSubmit(handleSubmit)}
                >
                  {drafts.billComposer
                    ? (
                      <OfflineDraftPanel
                        description="This bill composition draft is stored locally so billing can recover it after a refresh or network loss."
                        isOnline={isOnline}
                        onDiscard={discardDraft}
                        onRestore={restoreDraft}
                        title="Saved bill composer draft"
                        updatedAt={drafts.billComposer.updatedAt}
                      />
                    )
                    : null}

                  <label className="block">
                    <span className="text-sm font-medium text-ink">Appointment</span>
                    <Controller
                      control={form.control}
                      name="appointmentId"
                      render={({ field }) => (
                        <ThemedSelect
                          className="mt-2"
                          name={field.name}
                          onBlur={field.onBlur}
                          onChange={(event) => {
                            field.onChange(event);
                            syncAppointmentBillItems(event.target.value);
                          }}
                          value={field.value ?? ""}
                        >
                          <option value="">Select appointment</option>
                          {appointmentEntries
                            .filter((entry) =>
                              !["CANCELLED", "NO_SHOW"].includes(entry.status)
                            )
                            .map((entry) => (
                              <option key={entry.id} value={entry.id}>
                                {entry.patientHospitalNumber} - {entry.patientName} -{" "}
                                {entry.doctorName} - {formatDateTime(entry.scheduledFor)}
                              </option>
                            ))}
                        </ThemedSelect>
                      )}
                    />
                    <p className="mt-2 text-sm text-danger">
                      {form.formState.errors.appointmentId?.message}
                    </p>
                  </label>

                  {selectedAppointment
                    ? (
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="management-subtle-card px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                            Patient thread
                          </p>
                          <p className="mt-3 text-sm font-semibold text-foreground">
                            {selectedAppointment.patientName}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {selectedAppointment.patientHospitalNumber}
                          </p>
                        </div>
                        <div className="management-subtle-card px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                            Doctor
                          </p>
                          <div className="mt-3 flex items-start gap-3">
                            <Stethoscope className="mt-0.5 h-4 w-4 text-brand" />
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {selectedAppointment.doctorName}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {selectedAppointment.doctorDepartment ||
                                  "Department pending"}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="management-subtle-card px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                            Queue and status
                          </p>
                          <p className="mt-3 text-sm font-semibold text-foreground">
                            #{selectedAppointment.queueNumber ?? "--"} /{" "}
                            {selectedAppointment.visitType.replaceAll("_", " ")}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {selectedAppointment.status.replaceAll("_", " ")}
                          </p>
                        </div>
                        <div className="management-subtle-card px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                            Default consultation
                          </p>
                          <p className="mt-3 text-sm font-semibold text-foreground">
                            {formatCurrency(selectedAppointmentConsultationFee)}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatDateTime(selectedAppointment.scheduledFor)}
                          </p>
                        </div>
                      </div>
                    )
                    : null}

                  <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
                    <div className="management-subtle-card space-y-4 p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">
                            Charge catalog
                          </p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Add optional services on top of the consultation line.
                          </p>
                        </div>
                        <label className="management-search-shell w-full sm:max-w-xs">
                          <Search className="h-4 w-4 text-muted-foreground" />
                          <Input
                            className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                            onChange={(event) => setChargeSearch(event.target.value)}
                            placeholder="Search charge, code, category"
                            value={chargeSearch}
                          />
                        </label>
                      </div>

                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {activeChargeEntries.length === 0
                          ? (
                            <EmptyState
                              className="min-h-44"
                              description="No active charges are available yet. Create active charge master entries first."
                              icon={Wallet}
                              title="Charge catalog empty"
                            />
                          )
                          : null}

                        {activeChargeEntries.length > 0 && filteredChargeEntries.length === 0
                          ? (
                            <EmptyState
                              className="min-h-44"
                              description="No charge lines match the current search."
                              icon={Search}
                              title="No matching charges"
                            />
                          )
                          : null}

                        {filteredChargeEntries.map((entry) => {
                          const currentQuantity = normalizedWatchedItems
                            .filter((item) => item.chargeId === entry.id)
                            .reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);

                          return (
                            <div
                              key={entry.id}
                              className={cn(
                                "management-subtle-card flex items-start justify-between gap-4 px-4 py-4 transition-colors",
                                currentQuantity > 0 && "border-brand/30 bg-brand/5",
                              )}
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-foreground">
                                    {entry.name}
                                  </p>
                                  <Badge variant="outline">{entry.code}</Badge>
                                  {entry.taxable
                                    ? <Badge variant="secondary">Taxable</Badge>
                                    : null}
                                  {currentQuantity > 0
                                    ? <Badge variant="success">Added x{currentQuantity}</Badge>
                                    : null}
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">
                                  {entry.categoryLabel || "Category missing"}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-3">
                                <span className="text-sm font-semibold text-foreground">
                                  {formatCurrency(entry.unitPrice)}
                                </span>
                                <Button
                                  disabled={!selectedAppointment}
                                  onClick={() => addChargeToBill(entry.id)}
                                  size="sm"
                                  type="button"
                                  variant={currentQuantity > 0 ? "secondary" : "outline"}
                                >
                                  <Plus className="h-4 w-4" />
                                  {currentQuantity > 0 ? "Add again" : "Add"}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="management-subtle-card space-y-4 p-4">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">
                          Invoice canvas
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Consultation stays synced to the appointment. Optional charge lines remain editable before saving the draft.
                        </p>
                      </div>

                      {lineItemFields.length === 0
                        ? (
                          <EmptyState
                            className="min-h-44"
                            description="Select an appointment to load consultation context, then add optional charges from the catalog."
                            icon={FileText}
                            title="No bill items yet"
                          />
                        )
                        : null}

                      {form.formState.errors.items?.message
                        ? (
                          <p className="rounded-[calc(var(--radius-control)+0.05rem)] border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                            {form.formState.errors.items.message}
                          </p>
                        )
                        : null}

                      <div className="space-y-3">
                        {lineItemFields.map((field, index) => {
                          const watchedLine = normalizedWatchedItems[index];
                          const isConsultationLine = index === 0 &&
                            watchedLine?.chargeId === null &&
                            Boolean(selectedAppointmentId);
                          const lineQuantity = Number(watchedLine?.quantity ?? 0);
                          const lineUnitPrice = Number(watchedLine?.unitPrice ?? 0);
                          const lineTotal = Number(watchedLine?.quantity ?? 0) *
                            Number(watchedLine?.unitPrice ?? 0);

                          return (
                            <div
                              key={field.id}
                              className={cn(
                                "rounded-[calc(var(--radius-control)+0.2rem)] border border-border/70 bg-card px-4 py-4",
                                isConsultationLine && "border-brand/30 bg-brand/5",
                              )}
                            >
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge
                                      variant={isConsultationLine ? "secondary" : "outline"}
                                    >
                                      {isConsultationLine
                                        ? "Appointment consultation"
                                        : "Charge line"}
                                    </Badge>
                                    <p className="text-sm font-semibold text-foreground">
                                      {watchedLine?.description || "Charge line"}
                                    </p>
                                  </div>
                                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <Badge variant="outline">Qty {lineQuantity}</Badge>
                                    <Badge variant="outline">
                                      Rate {formatCurrency(lineUnitPrice)}
                                    </Badge>
                                    <Badge variant="outline">
                                      {isConsultationLine
                                        ? "Auto-synced from appointment"
                                        : "Locked to charge master"}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  {!isConsultationLine && watchedLine?.chargeId
                                    ? (
                                      <Button
                                        onClick={() => addChargeToBill(watchedLine.chargeId ?? "")}
                                        size="sm"
                                        type="button"
                                        variant="outline"
                                      >
                                        <Plus className="h-4 w-4" />
                                        Qty +1
                                      </Button>
                                    )
                                    : null}
                                  <div className="management-metric min-w-[8rem] px-3 py-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
                                      Line total
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-foreground">
                                      {formatCurrency(lineTotal)}
                                    </p>
                                  </div>
                                  <Button
                                    className="hover:border-destructive hover:text-destructive"
                                    disabled={isConsultationLine}
                                    onClick={() => removeLineItem(index)}
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    {isConsultationLine ? "Auto line" : "Remove"}
                                  </Button>
                                </div>
                              </div>

                              <input
                                {...form.register(`items.${index}.description`)}
                                type="hidden"
                              />
                              <input
                                {...form.register(`items.${index}.quantity`)}
                                type="hidden"
                              />
                              <input
                                {...form.register(`items.${index}.unitPrice`)}
                                type="hidden"
                              />
                              <input
                                {...form.register(`items.${index}.chargeId`)}
                                type="hidden"
                              />
                              <p className="mt-3 text-sm text-danger">
                                {form.formState.errors.items?.[index]?.description
                                  ?.message ||
                                  form.formState.errors.items?.[index]?.quantity
                                    ?.message ||
                                  form.formState.errors.items?.[index]?.unitPrice
                                    ?.message}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        {[
                          {
                            amount: effectiveDiscountAmount,
                            helper: "Apply a flat deduction or a percentage of subtotal.",
                            inputValue: discountInput,
                            label: "Discount",
                            mode: discountMode,
                            onInputChange: setDiscountInput,
                            onModeChange: setDiscountMode,
                          },
                          {
                            amount: effectiveTaxAmount,
                            helper: "Apply a flat tax or percentage on the post-discount base.",
                            inputValue: taxInput,
                            label: "Tax",
                            mode: taxMode,
                            onInputChange: setTaxInput,
                            onModeChange: setTaxMode,
                          },
                        ].map((adjustment) => {
                          const entryValue = parseAdjustmentInput(adjustment.inputValue);

                          return (
                            <div
                              key={adjustment.label}
                              className="rounded-[calc(var(--radius-control)+0.2rem)] border border-border/70 bg-card p-4"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-foreground">
                                    {adjustment.label}
                                  </p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {adjustment.helper}
                                  </p>
                                </div>
                                <div className="inline-flex rounded-full border border-border/70 bg-background p-1">
                                  <Button
                                    className="rounded-full px-3"
                                    onClick={() => adjustment.onModeChange("amount")}
                                    size="sm"
                                    type="button"
                                    variant={adjustment.mode === "amount" ? "secondary" : "ghost"}
                                  >
                                    Amount
                                  </Button>
                                  <Button
                                    className="rounded-full px-3"
                                    onClick={() => adjustment.onModeChange("percentage")}
                                    size="sm"
                                    type="button"
                                    variant={adjustment.mode === "percentage" ? "secondary" : "ghost"}
                                  >
                                    %
                                  </Button>
                                </div>
                              </div>

                              <div className="mt-4 flex items-center gap-3">
                                <Input
                                  className="bg-card"
                                  min="0"
                                  onChange={(event) =>
                                    adjustment.onInputChange(event.target.value)}
                                  step="0.01"
                                  type="number"
                                  value={adjustment.inputValue}
                                />
                                <Badge variant="outline">
                                  {adjustment.mode === "amount" ? "Rs" : "%"}
                                </Badge>
                              </div>

                              <p className="mt-3 text-sm text-muted-foreground">
                                {adjustment.mode === "percentage"
                                  ? `${entryValue}% applied = ${formatCurrency(adjustment.amount)}`
                                  : `Flat amount applied = ${formatCurrency(adjustment.amount)}`}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      <input {...form.register("discountAmount")} type="hidden" />
                      <input {...form.register("taxAmount")} type="hidden" />

                      <div className="management-metric rounded-[calc(var(--radius-control)+0.2rem)] p-4">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(subtotal)}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">Discount</span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(effectiveDiscountAmount)}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">Tax</span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(effectiveTaxAmount)}
                          </span>
                        </div>
                        <div className="mt-4 border-t border-border/70 pt-4">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-foreground">
                              Grand total
                            </span>
                            <span className="text-xl font-semibold text-foreground">
                              {formatCurrency(totalAmount)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 pb-2 pt-1">
                        <Button
                          disabled={createBillMutation.isPending ||
                            !selectedAppointment ||
                            lineItemFields.length === 0}
                          type="submit"
                        >
                          {createBillMutation.isPending
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <FileText className="h-4 w-4" />}
                          Create draft bill
                        </Button>

                        <Button
                          onClick={clearComposer}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Clear invoice
                        </Button>
                      </div>

                      <p className="text-sm leading-6 text-muted-foreground">
                        {isOnline
                          ? "Bill drafts autosave locally and can queue on this device if connectivity drops before submit."
                          : "You are offline. Draft bills will queue on this device and sync after reconnect."}
                      </p>

                      {usingCachedLookups
                        ? (
                          <p className="text-sm leading-6 text-muted-foreground mb-2">
                            Appointment and charge selectors are using the most
                            recently synced lookup cache from this browser.
                          </p>
                        )
                        : null}
                    </div>
                  </div>
                </form>
              )
              : (
                <EmptyState
                  className="mt-6 min-h-56 mb-8"
                  description="Draft creation requires the billing.create permission. Billing viewers can still inspect the register below."
                  icon={FileText}
                  title="Billing composer unavailable"
                />
              )}
        </div>
      </SurfaceCard>
    </div>
  );
}
