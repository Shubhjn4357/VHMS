"use client";

import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  CalendarClock,
  Download,
  Loader2,
  Printer,
  RefreshCcw,
  Search,
  Stethoscope,
  TimerReset,
  Trash2,
  UserRoundPen,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  startTransition,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { APPOINTMENT_STATUS } from "@/constants/appointmentStatus";
import { APPOINTMENT_VISIT_TYPES } from "@/constants/appointmentVisitType";
import { EmptyState } from "@/components/feedback/empty-state";
import { OfflineDraftPanel } from "@/components/pwa/offline-draft-panel";
import { BulkActionToolbar } from "@/components/tables/bulk-action-toolbar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SurfaceCard } from "@/components/ui/surface-card";
import { PageHeader } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import { ThemedSelect } from "@/components/ui/themed-select";
import {
  useAppointmentDirectory,
  useCreateAppointment,
  useDeleteAppointment,
  useUpdateAppointment,
} from "@/hooks/useAppointmentsApi";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { useDoctorLookup } from "@/hooks/useDoctorsApi";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { usePatientDirectory } from "@/hooks/usePatientsApi";
import { apiClient } from "@/lib/api/client";
import {
  downloadCsv,
  downloadExcelHtml,
  downloadJson,
  openPrintTable,
  type ExportColumn,
} from "@/lib/export/client";
import { createAppointmentSchema } from "@/lib/validators/appointments";
import { useOfflineStore } from "@/stores/offline-store";
import type { BulkActionResponse } from "@/types/bulk";
import type { AppointmentRecord } from "@/types/appointment";

type AppointmentFormValues = z.infer<typeof createAppointmentSchema>;

const defaultFormValues: AppointmentFormValues = {
  patientId: "",
  doctorId: "",
  scheduledFor: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  visitType: "SCHEDULED",
  status: "SCHEDULED",
  notes: "",
};

const defaultAppointmentFormValuesJson = JSON.stringify(defaultFormValues);

const statusToneMap: Record<string, string> = {
  SCHEDULED: "bg-[rgba(21,94,239,0.12)] text-accent",
  CONFIRMED: "bg-[rgba(15,118,110,0.12)] text-brand",
  CHECKED_IN: "bg-[rgba(21,128,61,0.12)] text-success",
  IN_CONSULTATION: "bg-[rgba(14,116,144,0.12)] text-cyan-700",
  COMPLETED: "bg-[rgba(20,32,51,0.08)] text-ink",
  CANCELLED: "bg-[rgba(220,38,38,0.12)] text-danger",
  NO_SHOW: "bg-[rgba(217,119,6,0.12)] text-warning",
  RESCHEDULED: "bg-[rgba(124,58,237,0.12)] text-[rgb(109,40,217)]",
};

function formatDateTime(value: string) {
  return format(new Date(value), "dd MMM yyyy, hh:mm a");
}

function formatDateTimeLocalInput(value: string) {
  return format(new Date(value), "yyyy-MM-dd'T'HH:mm");
}

function canCheckInStatus(status: AppointmentRecord["status"]) {
  return ["SCHEDULED", "CONFIRMED", "RESCHEDULED"].includes(status);
}

type AppointmentManagementProps = {
  hideHeader?: boolean;
};

export function AppointmentManagement({ hideHeader = false }: AppointmentManagementProps) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") ?? "";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    (typeof APPOINTMENT_STATUS)[number] | "ALL"
  >("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AppointmentRecord | null>(
    null,
  );
  const deferredSearch = useDebouncedSearch(search);

  const { canAccess: canCreate } = useModuleAccess(["appointments.create"]);
  const { canAccess: canUpdate } = useModuleAccess(["appointments.update"]);
  const { canAccess: canCheckIn } = useModuleAccess(["appointments.checkIn"]);
  const appointmentQuery = useAppointmentDirectory({
    q: deferredSearch,
    status: statusFilter,
  });
  const patientQuery = usePatientDirectory();
  const doctorQuery = useDoctorLookup();
  const createMutation = useCreateAppointment();
  const deleteMutation = useDeleteAppointment();
  const updateMutation = useUpdateAppointment();
  const isSaving = createMutation.isPending || updateMutation.isPending ||
    deleteMutation.isPending;
  const {
    clearDraft,
    drafts,
    enqueueAction,
    hydrated,
    isOnline,
    saveDraft,
  } = useOfflineQueue();
  const cachedPatientEntries = useOfflineStore((state) =>
    state.lookupCache.patients
  );
  const cachedDoctorEntries = useOfflineStore((state) =>
    state.lookupCache.doctors
  );
  const setLookupEntries = useOfflineStore((state) => state.setLookupEntries);

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: defaultFormValues,
  });
  const watchedFormValues = useWatch({
    control: form.control,
    defaultValue: defaultFormValues,
  }) as AppointmentFormValues;
  const appointmentDraftPayloadJson = JSON.stringify(watchedFormValues);

  useEffect(() => {
    setSearch(queryParam);
  }, [queryParam]);

  useEffect(() => {
    if (!selectedEntry) {
      form.reset(defaultFormValues);
      return;
    }

    form.reset({
      patientId: selectedEntry.patientId,
      doctorId: selectedEntry.doctorId,
      scheduledFor: formatDateTimeLocalInput(selectedEntry.scheduledFor),
      visitType: selectedEntry.visitType,
      status: selectedEntry.status,
      notes: selectedEntry.notes ?? "",
    });
  }, [form, selectedEntry]);

  useEffect(() => {
    const livePatientEntries = patientQuery.data?.entries ?? [];

    if (livePatientEntries.length === 0) {
      return;
    }

    setLookupEntries("patients", livePatientEntries);
  }, [patientQuery.dataUpdatedAt, patientQuery.data?.entries, setLookupEntries]);

  useEffect(() => {
    const liveDoctorEntries = doctorQuery.data?.entries ?? [];

    if (liveDoctorEntries.length === 0) {
      return;
    }

    setLookupEntries("doctors", liveDoctorEntries);
  }, [doctorQuery.dataUpdatedAt, doctorQuery.data?.entries, setLookupEntries]);

  useEffect(() => {
    if (!hydrated || selectedEntry) {
      return;
    }

    if (appointmentDraftPayloadJson === defaultAppointmentFormValuesJson) {
      return;
    }

    saveDraft({
      key: "appointmentScheduling",
      label: "Appointment scheduling",
      payload: JSON.parse(appointmentDraftPayloadJson) as AppointmentFormValues,
    });
  }, [
    appointmentDraftPayloadJson,
    hydrated,
    saveDraft,
    selectedEntry,
  ]);

  function beginEditing(entry: AppointmentRecord) {
    if (!canUpdate) {
      return;
    }

    startTransition(() => setSelectedEntry(entry));
  }

  function clearSelection() {
    startTransition(() => setSelectedEntry(null));
  }

  function restoreDraft() {
    const savedDraft = drafts.appointmentScheduling;

    if (!savedDraft) {
      return;
    }

    clearSelection();
    form.reset(savedDraft.payload as AppointmentFormValues);
    toast.success("Appointment draft restored.");
  }

  function discardDraft() {
    clearDraft("appointmentScheduling");
    form.reset(defaultFormValues);
    toast.success("Appointment draft removed.");
  }

  function clearAppointmentForm() {
    clearSelection();
    clearDraft("appointmentScheduling");
    form.reset(defaultFormValues);
    toast.success("Appointment form cleared.");
  }

  function handleDelete(entry: AppointmentRecord) {
    if (!canUpdate) {
      return;
    }

    const confirmed = window.confirm(
      `Delete appointment for ${entry.patientName}? Appointments already linked to billing cannot be deleted.`,
    );

    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(
      { id: entry.id },
      {
        onSuccess: () => {
          if (selectedEntry?.id === entry.id) {
            clearSelection();
          }
        },
      },
    );
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

  async function handleBulkStatusUpdate(
    status: AppointmentRecord["status"],
  ) {
    if (selectedEntries.length === 0) {
      return;
    }

    setIsBulkUpdating(true);

    try {
      const result = (
        await apiClient.post<BulkActionResponse>("/api/appointments/bulk", {
          action: "status",
          ids: selectedEntries.map((entry) => entry.id),
          status,
        })
      ).data;

      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] });
      clearBulkSelection();

      if (result.successCount > 0) {
        toast.success(
          `Updated ${result.successCount} appointments to ${status.replaceAll("_", " ")}.`,
        );
      }

      if (result.failedCount > 0) {
        toast.error(`${result.failedCount} appointments could not be updated.`);
      }
    } finally {
      setIsBulkUpdating(false);
    }
  }

  async function handleBulkDelete() {
    if (!canUpdate || selectedEntries.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedEntries.length} selected appointments? Appointments linked to billing will be skipped.`,
    );

    if (!confirmed) {
      return;
    }

    setIsBulkUpdating(true);

    try {
      const result = (
        await apiClient.post<BulkActionResponse>("/api/appointments/bulk", {
          action: "delete",
          ids: selectedEntries.map((entry) => entry.id),
        })
      ).data;

      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      await queryClient.invalidateQueries({ queryKey: ["bills"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] });

      if (selectedEntry && result.successIds.includes(selectedEntry.id)) {
        clearSelection();
      }

      clearBulkSelection();

      if (result.successCount > 0) {
        toast.success(`Deleted ${result.successCount} appointments.`);
      }

      if (result.failedCount > 0) {
        toast.error(`${result.failedCount} appointments could not be deleted.`);
      }
    } finally {
      setIsBulkUpdating(false);
    }
  }

  function exportSelectedAppointments(format: "csv" | "json" | "xls" | "print") {
    if (selectedEntries.length === 0) {
      return;
    }

    const filenameBase = `appointments-${new Date().toISOString().slice(0, 10)}`;

    if (format === "csv") {
      downloadCsv(
        `${filenameBase}.csv`,
        selectedEntries,
        appointmentExportColumns,
      );
      return;
    }

    if (format === "json") {
      downloadJson(`${filenameBase}.json`, selectedEntries);
      return;
    }

    if (format === "xls") {
      downloadExcelHtml(
        `${filenameBase}.xls`,
        "Appointment Export",
        selectedEntries,
        appointmentExportColumns,
      );
      return;
    }

    openPrintTable("Appointment Export", selectedEntries, appointmentExportColumns);
  }

  function handleSubmit(values: AppointmentFormValues) {
    if (selectedEntry) {
      if (!isOnline) {
        toast.error("Editing an appointment requires a live connection.");
        return;
      }

      updateMutation.mutate(
        {
          id: selectedEntry.id,
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

    if (!isOnline) {
      const patientName = patientEntries.find((entry) => entry.id === values.patientId)
        ?.fullName;
      const doctorName = doctorEntries.find((entry) => entry.id === values.doctorId)
        ?.fullName;

      enqueueAction({
        label: `Schedule ${patientName ?? "patient"} with ${
          doctorName ?? "doctor"
        }`,
        payload: values,
        type: "appointments.create",
        url: "/api/appointments",
      });
      clearDraft("appointmentScheduling");
      form.reset(defaultFormValues);
      toast.success("Appointment queued for sync.");
      return;
    }

    createMutation.mutate(values, {
      onSuccess: () => {
        clearDraft("appointmentScheduling");
        form.reset(defaultFormValues);
      },
    });
  }

  function handleCheckIn(entry: AppointmentRecord) {
    if (!canCheckIn || !canCheckInStatus(entry.status)) {
      return;
    }

    updateMutation.mutate({
      id: entry.id,
      status: "CHECKED_IN",
    });
  }

  const summary = appointmentQuery.data?.summary;
  const entries = useMemo(
    () => appointmentQuery.data?.entries ?? [],
    [appointmentQuery.data?.entries],
  );
  const patientEntries = patientQuery.data?.entries?.length
    ? patientQuery.data.entries
    : cachedPatientEntries;
  const doctorEntries = doctorQuery.data?.entries?.length
    ? doctorQuery.data.entries
    : cachedDoctorEntries;
  const canManageAppointments = canCreate || canUpdate;
  const usingCachedLookups = (!patientQuery.data?.entries?.length &&
    cachedPatientEntries.length > 0) ||
    (!doctorQuery.data?.entries?.length && cachedDoctorEntries.length > 0);
  const selectedEntries = entries.filter((entry) => selectedIds.includes(entry.id));
  const allVisibleSelected = entries.length > 0 &&
    entries.every((entry) => selectedIds.includes(entry.id));
  const appointmentExportColumns: ExportColumn<AppointmentRecord>[] = [
    { key: "patient", label: "Patient", value: (entry) => entry.patientName },
    {
      key: "hospitalNumber",
      label: "UHID",
      value: (entry) => entry.patientHospitalNumber,
    },
    { key: "doctor", label: "Doctor", value: (entry) => entry.doctorName },
    {
      key: "department",
      label: "Department",
      value: (entry) => entry.doctorDepartment,
    },
    {
      key: "scheduledFor",
      label: "Scheduled For",
      value: (entry) => formatDateTime(entry.scheduledFor),
    },
    {
      key: "visitType",
      label: "Visit Type",
      value: (entry) => entry.visitType,
    },
    { key: "status", label: "Status", value: (entry) => entry.status },
    { key: "queue", label: "Queue", value: (entry) => entry.queueNumber },
  ];

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) => entries.some((entry) => entry.id === id))
    );
  }, [entries]);

  return (
    <div className="space-y-6">
      {hideHeader
        ? null
        : (
          <PageHeader
            className="appointment-page-header"
            eyebrow="Phase 3 queue engine"
            title="Appointment scheduling and front-desk queue"
            description="This is the first real scheduling layer from the blueprint: patient-linked bookings, active doctor lookup, queue numbers per doctor-day, and permission-controlled check-in."
            actions={
              <>
                {canCreate
                  ? (
                    <Link
                      className={buttonVariants({ variant: "default" })}
                      href="/dashboard/appointments/new"
                    >
                      Full-page scheduling
                    </Link>
                  )
                  : null}
                <Button
                  onClick={() => void appointmentQuery.refetch()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {appointmentQuery.isFetching
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <RefreshCcw className="h-4 w-4" />}
                  Refresh
                </Button>
              </>
            }
          />
        )}

      <section className="appointment-summary-grid grid gap-4 xl:grid-cols-5">
        {[
          ["Appointments", summary?.total ?? 0, "Current working queue"],
          ["Upcoming", summary?.upcoming ?? 0, "Future consults still pending"],
          ["Checked in", summary?.checkedIn ?? 0, "Already at reception"],
          ["Completed", summary?.completed ?? 0, "Closed consultation flow"],
          ["Cancelled", summary?.cancelled ?? 0, "Removed from live queue"],
        ].map(([label, value, detail]) => (
          <SurfaceCard key={label}>
            <p className="text-sm text-ink-soft">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">
              {value}
            </p>
            <p className="mt-3 text-sm leading-6 text-ink-soft">{detail}</p>
          </SurfaceCard>
        ))}
      </section>

      <section className="appointment-main-grid grid gap-6 2xl:grid-cols-[1.08fr_0.92fr]">
        <SurfaceCard className="appointment-form-panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                {selectedEntry ? "Edit appointment" : "Schedule appointment"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                {selectedEntry
                  ? `Update queue slot #${selectedEntry.queueNumber ?? "NA"}`
                  : "Bind patient, doctor, and queue position"}
              </h2>
            </div>

            {selectedEntry
              ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => handleDelete(selectedEntry)}
                    size="sm"
                    type="button"
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete appointment
                  </Button>
                  <Button
                    onClick={clearSelection}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Cancel edit
                  </Button>
                </div>
              )
              : null}
          </div>

          {!selectedEntry && drafts.appointmentScheduling
            ? (
              <div className="mt-6">
                <OfflineDraftPanel
                  description="This queue draft is stored locally so the front desk can restore it after a refresh or temporary outage."
                  isOnline={isOnline}
                  onDiscard={discardDraft}
                  onRestore={restoreDraft}
                  title="Saved appointment scheduling draft"
                  updatedAt={drafts.appointmentScheduling.updatedAt}
                />
              </div>
            )
            : null}

          {canManageAppointments
            ? (
              <form
                className="mt-6 space-y-5"
                onSubmit={form.handleSubmit(handleSubmit)}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-ink">
                      Patient
                    </span>
                    <ThemedSelect
                      {...form.register("patientId")}
                      className="mt-2"
                    >
                      <option value="">Select patient</option>
                      {patientEntries.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.hospitalNumber} - {patient.fullName}
                        </option>
                      ))}
                    </ThemedSelect>
                    <p className="mt-2 text-sm text-danger">
                      {form.formState.errors.patientId?.message}
                    </p>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-ink">Doctor</span>
                    <ThemedSelect
                      {...form.register("doctorId")}
                      className="mt-2"
                    >
                      <option value="">Select doctor</option>
                      {doctorEntries.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.fullName}
                          {doctor.departmentName
                            ? ` - ${doctor.departmentName}`
                            : ""}
                        </option>
                      ))}
                    </ThemedSelect>
                    <p className="mt-2 text-sm text-danger">
                      {form.formState.errors.doctorId?.message}
                    </p>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-sm font-medium text-ink">
                      Scheduled for
                    </span>
                    <Input
                      {...form.register("scheduledFor")}
                      className="mt-2"
                      type="datetime-local"
                    />
                    <p className="mt-2 text-sm text-danger">
                      {form.formState.errors.scheduledFor?.message}
                    </p>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-ink">
                      Visit type
                    </span>
                    <ThemedSelect
                      {...form.register("visitType")}
                      className="mt-2"
                    >
                      {APPOINTMENT_VISIT_TYPES.map((visitType) => (
                        <option key={visitType} value={visitType}>
                          {visitType.replaceAll("_", " ")}
                        </option>
                      ))}
                    </ThemedSelect>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-ink">Status</span>
                    <ThemedSelect
                      {...form.register("status")}
                      className="mt-2"
                    >
                      {APPOINTMENT_STATUS.map((status) => (
                        <option key={status} value={status}>
                          {status.replaceAll("_", " ")}
                        </option>
                      ))}
                    </ThemedSelect>
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-ink">Notes</span>
                  <Textarea
                    {...form.register("notes")}
                    className="mt-2 min-h-28"
                    placeholder="Walk-in reason, reminder note, or reschedule context."
                  />
                  <p className="mt-2 text-sm text-danger">
                    {form.formState.errors.notes?.message}
                  </p>
                </label>

                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={isSaving ||
                      patientEntries.length === 0 ||
                      doctorEntries.length === 0 ||
                      (!canCreate && !selectedEntry)}
                    type="submit"
                  >
                    {isSaving
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : selectedEntry
                      ? <UserRoundPen className="h-4 w-4" />
                      : <CalendarClock className="h-4 w-4" />}
                    {selectedEntry ? "Save appointment" : "Schedule appointment"}
                  </Button>

                  <Button
                    onClick={clearAppointmentForm}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Clear form
                  </Button>
                </div>

                {!selectedEntry
                  ? (
                    <p className="text-sm leading-6 text-ink-soft">
                      {isOnline
                        ? "New appointments autosave locally and can queue safely on this device if reception loses connectivity."
                        : "You are offline. New appointments will queue on this device and sync after reconnect."}
                    </p>
                  )
                  : null}

                {usingCachedLookups
                  ? (
                    <p className="text-sm leading-6 text-ink-soft">
                      Doctor and patient selectors are using the most recently
                      synced lookup cache from this browser.
                    </p>
                  )
                  : null}
              </form>
            )
            : (
              <EmptyState
                className="mt-6 min-h-56"
                description="This queue board is visible to appointment viewers, but creating or editing records requires appointments.create or appointments.update."
                icon={CalendarClock}
                title="Read-only schedule view"
              />
            )}
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard className="appointment-queue-panel">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  Live queue
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                  Patient-linked appointments
                </h2>
              </div>

            <div className="flex flex-col gap-3 sm:flex-row">
                <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                  <Search className="h-4 w-4 text-brand" />
                  <Input
                    className="h-auto min-w-44 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search patient, doctor, UHID"
                    value={search}
                  />
                </label>

                <ThemedSelect
                  className="glass-panel-muted rounded-full py-3 font-medium"
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as
                        | (typeof APPOINTMENT_STATUS)[number]
                        | "ALL",
                    )}
                  value={statusFilter}
                >
                  <option value="ALL">All statuses</option>
                  {APPOINTMENT_STATUS.map((status) => (
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
                itemLabel="appointment"
                onClear={clearBulkSelection}
              >
                <Button
                  onClick={() => exportSelectedAppointments("csv")}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
                <Button
                  onClick={() => exportSelectedAppointments("xls")}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Download className="h-4 w-4" />
                  Excel
                </Button>
                <Button
                  onClick={() => exportSelectedAppointments("json")}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Download className="h-4 w-4" />
                  JSON
                </Button>
                <Button
                  onClick={() => exportSelectedAppointments("print")}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                {canUpdate
                  ? (
                    <>
                      <Button
                        disabled={isBulkUpdating}
                        onClick={() => void handleBulkStatusUpdate("CONFIRMED")}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Confirm
                      </Button>
                      <Button
                        disabled={isBulkUpdating}
                        onClick={() => void handleBulkStatusUpdate("CANCELLED")}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </>
                  )
                  : null}
                {canCheckIn
                  ? (
                    <Button
                      disabled={isBulkUpdating}
                      onClick={() => void handleBulkStatusUpdate("CHECKED_IN")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Check in
                    </Button>
                  )
                  : null}
                {canUpdate
                  ? (
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
                  )
                  : null}
              </BulkActionToolbar>
            </div>

            <div className="mt-6 space-y-4">
              {appointmentQuery.isLoading
                ? (
                  <div className="glass-panel-muted flex items-center gap-3 rounded-3xl px-4 py-5 text-sm text-ink-soft">
                    <Loader2 className="h-4 w-4 animate-spin text-brand" />
                    Loading appointment queue
                  </div>
                )
                : null}

              {!appointmentQuery.isLoading && entries.length === 0
                ? (
                  <EmptyState
                    description="No appointments match the current filters. Once patients and doctors are connected in the schedule form, queue positions will appear here."
                    icon={CalendarClock}
                    title="No appointments found"
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
                            {entry.patientName}
                          </h3>
                          <span className="glass-chip rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                            {entry.patientHospitalNumber}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                              statusToneMap[entry.status] ?? "glass-chip text-ink"
                            }`}
                          >
                            {entry.status.replaceAll("_", " ")}
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-ink-soft">
                          {entry.doctorName}
                          {entry.doctorDepartment
                            ? ` / ${entry.doctorDepartment}`
                            : ""}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <div className="metric-tile rounded-[22px] px-4 py-3 text-center">
                          <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">
                            Queue
                          </p>
                          <p className="mt-1 text-lg font-semibold text-ink">
                            #{entry.queueNumber ?? "--"}
                          </p>
                        </div>
                        <div className="metric-tile rounded-[22px] px-4 py-3 text-center">
                          <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">
                            Visit
                          </p>
                          <p className="mt-1 text-lg font-semibold text-ink">
                            {entry.visitType.replaceAll("_", " ")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="metric-tile rounded-[22px] px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                          Slot
                        </p>
                        <p className="mt-2 text-sm font-medium text-ink">
                          {formatDateTime(entry.scheduledFor)}
                        </p>
                        <p className="mt-1 text-sm text-ink-soft">
                          {entry.checkedInAt
                            ? `Checked in ${formatDateTime(entry.checkedInAt)}`
                            : "Not checked in yet"}
                        </p>
                      </div>

                      <div className="metric-tile rounded-[22px] px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                          Notes
                        </p>
                        <p className="mt-2 text-sm leading-6 text-ink-soft">
                          {entry.notes || "No scheduling note added."}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {canCheckIn && canCheckInStatus(entry.status)
                        ? (
                          <Button
                            onClick={() => handleCheckIn(entry)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <TimerReset className="h-4 w-4" />
                            Check in
                          </Button>
                        )
                        : null}

                      {canUpdate
                        ? (
                          <Button
                            onClick={() => handleDelete(entry)}
                            size="sm"
                            type="button"
                            variant="destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        )
                        : null}

                      {canUpdate
                        ? (
                          <Button
                            onClick={() => beginEditing(entry)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <UserRoundPen className="h-4 w-4" />
                            Edit appointment
                          </Button>
                        )
                        : null}
                    </div>
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

          <SurfaceCard className="appointment-doctors-panel">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(15,118,110,0.12)] text-brand">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  Active doctors
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
                  Lookup for schedule binding
                </h2>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {doctorEntries.map((doctor) => (
                <div
                  key={doctor.id}
                  className="glass-panel-muted rounded-[22px] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-ink">
                        {doctor.fullName}
                      </p>
                      <p className="text-sm text-ink-soft">
                        {doctor.departmentName || "Department pending"}
                        {doctor.specialty ? ` / ${doctor.specialty}` : ""}
                      </p>
                    </div>
                    <span className="glass-chip rounded-full px-3 py-2 text-sm font-medium text-ink">
                      Rs {doctor.consultationFee.toFixed(0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>
        </div>
      </section>
    </div>
  );
}
