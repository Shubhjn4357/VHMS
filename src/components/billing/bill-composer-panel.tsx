"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Loader2, Plus, Wallet } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { EmptyState } from "@/components/feedback/empty-state";
import { OfflineDraftPanel } from "@/components/pwa/offline-draft-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SurfaceCard } from "@/components/ui/surface-card";
import { ThemedSelect } from "@/components/ui/themed-select";
import { useAppointmentDirectory } from "@/hooks/useAppointmentsApi";
import { useCreateBill } from "@/hooks/useBillingApi";
import { useChargeDirectory } from "@/hooks/useChargesApi";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { createBillSchema } from "@/lib/validators/billing";
import { useOfflineStore } from "@/stores/offline-store";

type BillFormInput = z.input<typeof createBillSchema>;
type BillFormValues = z.output<typeof createBillSchema>;
type BillDraftValues = {
  appointmentId: string;
  discountAmount: number;
  taxAmount: number;
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
  taxAmount?: number | string;
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
  taxAmount: 0,
  items: [],
};

const defaultBillFormValuesJson = JSON.stringify(billDefaultDraftValues);

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
  const form = useForm<BillFormInput, unknown, BillFormValues>({
    resolver: zodResolver(createBillSchema),
    defaultValues: billDefaultValues,
  });
  const itemsFieldArray = useFieldArray({
    control: form.control,
    name: "items",
  });
  const skipAutoPopulateRef = useRef(false);
  const watchedDraftValues = useWatch({
    control: form.control,
  }) as BillDraftFormState;
  const normalizedBillDraftValues: BillDraftValues = {
    appointmentId: watchedDraftValues?.appointmentId ?? "",
    discountAmount: Number(watchedDraftValues?.discountAmount ?? 0),
    taxAmount: Number(watchedDraftValues?.taxAmount ?? 0),
    items: (watchedDraftValues?.items ?? []).map((item) => ({
      chargeId: item?.chargeId ?? null,
      description: item?.description ?? "",
      quantity: Number(item?.quantity ?? 0),
      unitPrice: Number(item?.unitPrice ?? 0),
    })),
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
  });
  const watchedDiscountAmount = useWatch({
    control: form.control,
    name: "discountAmount",
    defaultValue: billDefaultValues.discountAmount,
  });
  const watchedTaxAmount = useWatch({
    control: form.control,
    name: "taxAmount",
    defaultValue: billDefaultValues.taxAmount,
  });

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
  const selectedAppointmentDoctorName = selectedAppointment?.doctorName ?? "";
  const selectedAppointmentConsultationFee =
    selectedAppointment?.doctorConsultationFee ?? 0;
  const selectedAppointmentAutoFillKey = selectedAppointment
    ? [
      selectedAppointmentId,
      selectedAppointmentDoctorName,
      selectedAppointmentConsultationFee,
    ].join(":")
    : "none";

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
  }, [appointmentEntries, appointmentParam, form]);

  useEffect(() => {
    if (skipAutoPopulateRef.current) {
      skipAutoPopulateRef.current = false;
      return;
    }

    const currentItems: BillFormValues["items"] = form.getValues("items").map(
      (item) => ({
        chargeId: item.chargeId ?? null,
        description: item.description ?? "",
        quantity: Number(item.quantity ?? 0),
        unitPrice: Number(item.unitPrice ?? 0),
      }),
    );

    if (!selectedAppointmentId) {
      if (currentItems.length > 0) {
        itemsFieldArray.replace([]);
      }
      return;
    }

    if (selectedAppointmentConsultationFee <= 0) {
      if (currentItems.length > 0) {
        itemsFieldArray.replace([]);
      }
      return;
    }

    const nextItems: BillFormValues["items"] = [
      {
        chargeId: null,
        description: `${selectedAppointmentDoctorName} consultation`,
        quantity: 1,
        unitPrice: selectedAppointmentConsultationFee,
      },
    ];

    if (!hasSameBillItems(currentItems, nextItems)) {
      itemsFieldArray.replace(nextItems);
    }
  }, [
    form,
    itemsFieldArray,
    selectedAppointmentConsultationFee,
    selectedAppointmentDoctorName,
    selectedAppointmentId,
    selectedAppointmentAutoFillKey,
  ]);

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
    itemsFieldArray.replace([]);
  }

  function addChargeToBill(chargeId: string) {
    const selectedCharge = activeChargeEntries.find((entry) =>
      entry.id === chargeId
    );
    if (!selectedCharge) {
      return;
    }

    const existingIndex = watchedItems.findIndex((item) =>
      item.chargeId === chargeId
    );
    if (existingIndex >= 0) {
      const currentQuantity = Number(
        watchedItems[existingIndex]?.quantity ?? 0,
      );
      form.setValue(`items.${existingIndex}.quantity`, currentQuantity + 1, {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }

    itemsFieldArray.append({
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

    skipAutoPopulateRef.current = true;
    form.reset(savedDraft.payload as BillDraftValues);
    itemsFieldArray.replace((savedDraft.payload as BillDraftValues).items);
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

  const subtotal = watchedItems.reduce((sum, item) => {
    const quantity = Number(item.quantity ?? 0);
    const unitPrice = Number(item.unitPrice ?? 0);
    return sum + quantity * unitPrice;
  }, 0);
  const totalAmount = Math.max(
    0,
    subtotal + Number(watchedTaxAmount ?? 0) -
      Number(watchedDiscountAmount ?? 0),
  );
  const usingCachedLookups = (!appointmentQuery.data?.entries?.length &&
    cachedAppointmentEntries.length > 0) ||
    (!chargeQuery.data?.entries?.length && cachedChargeEntries.length > 0);

  return (
    <SurfaceCard>
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          OPD billing composer
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          Draft bill from appointment context
        </h2>
      </div>

      {canCreateBilling
        ? (
          <form
            className="mt-6 space-y-5"
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
              <ThemedSelect
                {...form.register("appointmentId")}
                className="mt-2"
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
              <p className="mt-2 text-sm text-danger">
                {form.formState.errors.appointmentId?.message}
              </p>
            </label>

            {selectedAppointment
              ? (
                <div className="glass-panel-muted grid gap-3 rounded-[24px] p-4 md:grid-cols-3">
                  <div className="metric-tile rounded-[20px] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                      Patient
                    </p>
                    <p className="mt-2 text-sm font-medium text-ink">
                      {selectedAppointment.patientName}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {selectedAppointment.patientHospitalNumber}
                    </p>
                  </div>
                  <div className="metric-tile rounded-[20px] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                      Doctor
                    </p>
                    <p className="mt-2 text-sm font-medium text-ink">
                      {selectedAppointment.doctorName}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {selectedAppointment.doctorDepartment ||
                        "Department pending"}
                    </p>
                  </div>
                  <div className="metric-tile rounded-[20px] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                      Queue and status
                    </p>
                    <p className="mt-2 text-sm font-medium text-ink">
                      #{selectedAppointment.queueNumber ?? "--"} /{" "}
                      {selectedAppointment.visitType.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {selectedAppointment.status.replaceAll("_", " ")}
                    </p>
                  </div>
                </div>
              )
              : null}

            <div className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
              <div className="glass-panel-muted space-y-4 rounded-[28px] p-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">
                    Active charge catalog
                  </p>
                  <p className="mt-2 text-sm text-ink-soft">
                    Add optional charges on top of the default consultation
                    line.
                  </p>
                </div>

                <div className="space-y-3">
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

                  {activeChargeEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="glass-chip flex items-center justify-between gap-3 rounded-[20px] px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {entry.name}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-soft">
                          {entry.categoryLabel || "Category missing"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-ink">
                          {formatCurrency(entry.unitPrice)}
                        </span>
                        <Button
                          onClick={() => addChargeToBill(entry.id)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Plus className="h-4 w-4" />
                          Add
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel-muted space-y-4 rounded-[28px] p-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">
                    Bill line items
                  </p>
                  <p className="mt-2 text-sm text-ink-soft">
                    Consultation is loaded from the selected appointment.
                    Quantities and prices remain editable before saving the
                    draft.
                  </p>
                </div>

                {itemsFieldArray.fields.length === 0
                  ? (
                    <EmptyState
                      className="min-h-44"
                      description="Select an appointment to load consultation context, then add optional charges from the catalog."
                      icon={FileText}
                      title="No bill items yet"
                    />
                  )
                  : null}

                <div className="space-y-3">
                  {itemsFieldArray.fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="glass-panel rounded-[22px] p-4"
                    >
                      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.35fr_0.35fr_auto]">
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                            Description
                          </span>
                          <Input
                            {...form.register(`items.${index}.description`)}
                            className="mt-2 rounded-[18px]"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                            Qty
                          </span>
                          <Input
                            {...form.register(`items.${index}.quantity`)}
                            className="mt-2 rounded-[18px]"
                            min="0.01"
                            step="0.01"
                            type="number"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                            Rate
                          </span>
                          <Input
                            {...form.register(`items.${index}.unitPrice`)}
                            className="mt-2 rounded-[18px]"
                            min="0"
                            step="0.01"
                            type="number"
                          />
                        </label>
                        <div className="flex items-end">
                          <Button
                            className="hover:border-destructive hover:text-destructive"
                            onClick={() => itemsFieldArray.remove(index)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>

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
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-ink">
                      Discount
                    </span>
                    <Input
                      {...form.register("discountAmount")}
                      className="mt-2 bg-card"
                      min="0"
                      step="0.01"
                      type="number"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-ink">Tax</span>
                    <Input
                      {...form.register("taxAmount")}
                      className="mt-2 bg-card"
                      min="0"
                      step="0.01"
                      type="number"
                    />
                  </label>
                </div>

                <div className="metric-tile rounded-[22px] p-4">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-ink-soft">Subtotal</span>
                    <span className="font-medium text-ink">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <span className="text-ink-soft">Discount</span>
                    <span className="font-medium text-ink">
                      {formatCurrency(Number(watchedDiscountAmount ?? 0))}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <span className="text-ink-soft">Tax</span>
                    <span className="font-medium text-ink">
                      {formatCurrency(Number(watchedTaxAmount ?? 0))}
                    </span>
                  </div>
                  <div className="mt-4 border-t border-line pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-ink">
                        Grand total
                      </span>
                      <span className="text-xl font-semibold text-ink">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={createBillMutation.isPending ||
                      !selectedAppointment ||
                      itemsFieldArray.fields.length === 0}
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

                <p className="text-sm leading-6 text-ink-soft">
                  {isOnline
                    ? "Bill drafts autosave locally and can queue on this device if connectivity drops before submit."
                    : "You are offline. Draft bills will queue on this device and sync after reconnect."}
                </p>

                {usingCachedLookups
                  ? (
                    <p className="text-sm leading-6 text-ink-soft">
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
            className="mt-6 min-h-56"
            description="Draft creation requires the billing.create permission. Billing viewers can still inspect the register below."
            icon={FileText}
            title="Billing composer unavailable"
          />
        )}
    </SurfaceCard>
  );
}
