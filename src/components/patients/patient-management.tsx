"use client";

import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Download,
  Loader2,
  Printer,
  RefreshCcw,
  Search,
  Trash2,
  UserRound,
  UserRoundPen,
} from "lucide-react";

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

import { BLOOD_GROUPS } from "@/constants/bloodGroups";
import { PATIENT_GENDERS } from "@/constants/patientGender";
import { EmptyState } from "@/components/feedback/empty-state";
import { UploadField } from "@/components/forms/upload-field";
import { OfflineDraftPanel } from "@/components/pwa/offline-draft-panel";
import { BulkActionToolbar } from "@/components/tables/bulk-action-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { OptionsMenu } from "@/components/ui/options-menu";
import { SurfaceCard } from "@/components/ui/surface-card";
import { PageHeader } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import { ThemedSelect } from "@/components/ui/themed-select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/bottom-drawer";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import {
  useCreatePatient,
  useDeletePatient,
  usePatientDirectory,
  useUpdatePatient,
} from "@/hooks/usePatientsApi";
import { apiClient } from "@/lib/api/client";
import {
  downloadCsv,
  downloadExcelHtml,
  downloadJson,
  openPrintTable,
  type ExportColumn,
} from "@/lib/export/client";
import { createPatientSchema } from "@/lib/validators/patients";
import type { BulkActionResponse } from "@/types/bulk";
import type { PatientRecord } from "@/types/patient";

type PatientFormValues = z.infer<typeof createPatientSchema>;

const defaultFormValues: PatientFormValues = {
  firstName: "",
  lastName: "",
  gender: "UNKNOWN",
  dateOfBirth: "",
  phone: "",
  alternatePhone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  emergencyContact: "",
  bloodGroup: "",
  photoUrl: "",
  notes: "",
};

const defaultPatientFormValuesJson = JSON.stringify(defaultFormValues);

function formatDateTime(value: string) {
  return format(new Date(value), "dd MMM yyyy, hh:mm a");
}

function formatPatientLocation(patient: PatientRecord) {
  const location = [patient.city, patient.state].filter(Boolean).join(", ");
  return location || patient.address || "Address not added";
}

type PatientManagementProps = {
  hideHeader?: boolean;
};

export function PatientManagement({ hideHeader = false }: PatientManagementProps) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") ?? "";
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<PatientRecord | null>(
    null,
  );
  const deferredSearch = useDebouncedSearch(search);

  const { canAccess: canCreate } = useModuleAccess(["patients.create"]);
  const { canAccess: canUpdate } = useModuleAccess(["patients.update"]);
  const directoryQuery = usePatientDirectory({ q: deferredSearch });
  const createMutation = useCreatePatient();
  const deleteMutation = useDeletePatient();
  const updateMutation = useUpdatePatient();
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

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: defaultFormValues,
  });
  const watchedFormValues = useWatch({
    control: form.control,
    defaultValue: defaultFormValues,
  }) as PatientFormValues;
  const photoUrlValue = useWatch({
    control: form.control,
    name: "photoUrl",
    defaultValue: defaultFormValues.photoUrl,
  });
  const patientDraftPayloadJson = JSON.stringify(watchedFormValues);

  useEffect(() => {
    setSearch(queryParam);
  }, [queryParam]);

  useEffect(() => {
    if (!selectedEntry) {
      form.reset(defaultFormValues);
      return;
    }

    form.reset({
      firstName: selectedEntry.firstName,
      lastName: selectedEntry.lastName ?? "",
      gender: selectedEntry.gender,
      dateOfBirth: selectedEntry.dateOfBirth ?? "",
      phone: selectedEntry.phone ?? "",
      alternatePhone: selectedEntry.alternatePhone ?? "",
      email: selectedEntry.email ?? "",
      address: selectedEntry.address ?? "",
      city: selectedEntry.city ?? "",
      state: selectedEntry.state ?? "",
      emergencyContact: selectedEntry.emergencyContact ?? "",
      bloodGroup: selectedEntry.bloodGroup ?? "",
      photoUrl: selectedEntry.photoUrl ?? "",
      notes: selectedEntry.notes ?? "",
    });
  }, [form, selectedEntry]);

  useEffect(() => {
    if (!hydrated || selectedEntry) {
      return;
    }

    if (patientDraftPayloadJson === defaultPatientFormValuesJson) {
      return;
    }

    saveDraft({
      key: "patientRegistration",
      label: "Patient registration",
      payload: JSON.parse(patientDraftPayloadJson) as PatientFormValues,
    });
  }, [hydrated, patientDraftPayloadJson, saveDraft, selectedEntry]);

  function beginEditing(entry: PatientRecord) {
    if (!canUpdate) {
      return;
    }

    startTransition(() => {
      setSelectedEntry(entry);
      setIsDrawerOpen(true);
    });
  }

  function clearSelection() {
    startTransition(() => {
      setSelectedEntry(null);
      setIsDrawerOpen(false);
    });
  }

  function restoreDraft() {
    const savedDraft = drafts.patientRegistration;

    if (!savedDraft) {
      return;
    }

    clearSelection();
    form.reset(savedDraft.payload as PatientFormValues);
    toast.success("Patient registration draft restored.");
  }

  function discardDraft() {
    clearDraft("patientRegistration");
    form.reset(defaultFormValues);
    toast.success("Patient registration draft removed.");
  }

  function clearPatientForm() {
    clearSelection();
    clearDraft("patientRegistration");
    form.reset(defaultFormValues);
    toast.success("Patient form cleared.");
  }

  function handleDelete(entry: PatientRecord) {
    if (!canUpdate) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${entry.fullName}? Patients linked to appointments, admissions, billing, consents, or communications cannot be deleted.`,
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

  async function handleBulkDelete() {
    if (!canUpdate || selectedEntries.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedEntries.length} selected patients? Linked records will be skipped.`,
    );

    if (!confirmed) {
      return;
    }

    setIsBulkDeleting(true);

    try {
      const result = (
        await apiClient.post<BulkActionResponse>("/api/patients/bulk", {
          ids: selectedEntries.map((entry) => entry.id),
        })
      ).data;

      await queryClient.invalidateQueries({ queryKey: ["patients"] });
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      await queryClient.invalidateQueries({ queryKey: ["search"] });

      if (selectedEntry && result.successIds.includes(selectedEntry.id)) {
        clearSelection();
      }

      clearBulkSelection();

      if (result.successCount > 0) {
        toast.success(`Deleted ${result.successCount} patient records.`);
      }

      if (result.failedCount > 0) {
        toast.error(
          `${result.failedCount} patient records could not be deleted because they are still linked to operational data.`,
        );
      }
    } finally {
      setIsBulkDeleting(false);
    }
  }

  function exportSelectedPatients(format: "csv" | "json" | "xls" | "print") {
    if (selectedEntries.length === 0) {
      return;
    }

    const filenameBase = `patients-${new Date().toISOString().slice(0, 10)}`;

    if (format === "csv") {
      downloadCsv(`${filenameBase}.csv`, selectedEntries, patientExportColumns);
      return;
    }

    if (format === "json") {
      downloadJson(`${filenameBase}.json`, selectedEntries);
      return;
    }

    if (format === "xls") {
      downloadExcelHtml(
        `${filenameBase}.xls`,
        "Patient Directory Export",
        selectedEntries,
        patientExportColumns,
      );
      return;
    }

    openPrintTable("Patient Directory Export", selectedEntries, patientExportColumns);
  }

  function handleSubmit(values: PatientFormValues) {
    if (selectedEntry) {
      if (!isOnline) {
        toast.error("Editing an existing patient requires a live connection.");
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
      enqueueAction({
        label: `Register ${
          [values.firstName, values.lastName].filter(Boolean).join(" ")
        }`,
        payload: values,
        type: "patients.create",
        url: "/api/patients",
      });
      clearDraft("patientRegistration");
      form.reset(defaultFormValues);
      toast.success("Patient registration queued for sync.");
      return;
    }

    createMutation.mutate(values, {
      onSuccess: () => {
        clearDraft("patientRegistration");
        form.reset(defaultFormValues);
        setIsDrawerOpen(false);
      },
    });
  }

  const summary = directoryQuery.data?.summary;
  const entries = useMemo(
    () => directoryQuery.data?.entries ?? [],
    [directoryQuery.data?.entries],
  );
  const canManagePatients = canCreate || canUpdate;
  const selectedEntries = entries.filter((entry) => selectedIds.includes(entry.id));
  const allVisibleSelected = entries.length > 0 &&
    entries.every((entry) => selectedIds.includes(entry.id));
  const patientExportColumns: ExportColumn<PatientRecord>[] = [
    {
      key: "hospitalNumber",
      label: "Hospital Number",
      value: (entry) => entry.hospitalNumber,
    },
    { key: "fullName", label: "Full Name", value: (entry) => entry.fullName },
    { key: "gender", label: "Gender", value: (entry) => entry.gender },
    { key: "phone", label: "Phone", value: (entry) => entry.phone },
    { key: "email", label: "Email", value: (entry) => entry.email },
    {
      key: "bloodGroup",
      label: "Blood Group",
      value: (entry) => entry.bloodGroup,
    },
    {
      key: "location",
      label: "Location",
      value: (entry) => formatPatientLocation(entry),
    },
    {
      key: "updatedAt",
      label: "Updated At",
      value: (entry) => formatDateTime(entry.updatedAt),
    },
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
            className="patient-page-header"
            eyebrow="Phase 3 patient master"
            title="Patient directory and registration"
            description="Reception and billing now work from a real patient thread. Search by hospital number, contact details, or name, then keep the profile complete enough for scheduling and downstream billing."
            actions={
              <>
                {canCreate
                  ? (
                    <Button
                      className={buttonVariants({ variant: "default" })}
                      onClick={() => {
                        clearSelection();
                        setIsDrawerOpen(true);
                      }}
                    >
                      <UserRound className="mr-2 h-4 w-4" />
                      Register patient
                    </Button>
                  )
                  : null}
                <Button
                  onClick={() => void directoryQuery.refetch()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {directoryQuery.isFetching
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <RefreshCcw className="h-4 w-4" />}
                  Refresh
                </Button>
              </>
            }
          />
        )}

      <section className="patient-summary-grid grid gap-4 xl:grid-cols-4">
        {[
          ["Registered patients", summary?.total ?? 0, "Master directory size"],
          [
            "Added this week",
            summary?.addedThisWeek ?? 0,
            "Fresh registration load",
          ],
          [
            "Primary phones",
            summary?.withPrimaryPhone ?? 0,
            "Ready for reminder flows",
          ],
          [
            "Needs completion",
            summary?.missingCriticalProfile ?? 0,
            "Missing phone or date of birth",
          ],
        ].map(([label, value, detail]) => (
          <SurfaceCard key={label}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {value}
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{detail}</p>
          </SurfaceCard>
        ))}
      </section>

      <section className="patient-main-grid space-y-6">
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>
                {selectedEntry ? "Edit patient profile" : "Register patient"}
              </DrawerTitle>
              <DrawerDescription>
                {selectedEntry
                  ? `Update ${selectedEntry.fullName}`
                  : "Capture the patient identity once"}
              </DrawerDescription>
            </DrawerHeader>

            <div className="p-4 bg-background">
              <div className="flex items-start justify-between gap-4">
                <div />
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
                        Delete patient
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

              {!selectedEntry && drafts.patientRegistration
                ? (
                  <div className="mt-2">
                    <OfflineDraftPanel
                      description="This registration draft is stored locally in the browser, so reception can recover it after a refresh or connection drop."
                      isOnline={isOnline}
                      onDiscard={discardDraft}
                      onRestore={restoreDraft}
                      title="Saved patient registration draft"
                      updatedAt={drafts.patientRegistration.updatedAt}
                    />
                  </div>
                )
                : null}

              {canManagePatients
                ? (
                  <form
                    className="mt-4 space-y-5"
                    onSubmit={form.handleSubmit(handleSubmit)}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-medium text-ink">
                          First name
                        </span>
                        <Input
                          {...form.register("firstName")}
                          className="mt-2"
                          placeholder="Ritika"
                        />
                        <p className="mt-2 text-sm text-danger">
                          {form.formState.errors.firstName?.message}
                        </p>
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-ink">
                          Last name
                        </span>
                        <Input
                          {...form.register("lastName")}
                          className="mt-2"
                          placeholder="Sharma"
                        />
                        <p className="mt-2 text-sm text-danger">
                          {form.formState.errors.lastName?.message}
                        </p>
                      </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <label className="block">
                        <span className="text-sm font-medium text-ink">Gender</span>
                        <ThemedSelect
                          {...form.register("gender")}
                          className="mt-2"
                        >
                          {PATIENT_GENDERS.map((gender) => (
                            <option key={gender} value={gender}>
                              {gender.replaceAll("_", " ")}
                            </option>
                          ))}
                        </ThemedSelect>
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-ink">
                          Date of birth
                        </span>
                        <Input
                          {...form.register("dateOfBirth")}
                          className="mt-2"
                          type="date"
                        />
                        <p className="mt-2 text-sm text-danger">
                          {form.formState.errors.dateOfBirth?.message}
                        </p>
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-ink">
                          Blood group
                        </span>
                        <ThemedSelect
                          {...form.register("bloodGroup")}
                          className="mt-2"
                        >
                          <option value="">Not captured</option>
                          {BLOOD_GROUPS.map((bloodGroup) => (
                            <option key={bloodGroup} value={bloodGroup}>
                              {bloodGroup}
                            </option>
                          ))}
                        </ThemedSelect>
                        <p className="mt-2 text-sm text-danger">
                          {form.formState.errors.bloodGroup?.message}
                        </p>
                      </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-medium text-ink">Phone</span>
                        <Input
                          {...form.register("phone")}
                          className="mt-2"
                          placeholder="+91-9876543210"
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-ink">
                          Alternate phone
                        </span>
                        <Input
                          {...form.register("alternatePhone")}
                          className="mt-2"
                          placeholder="+91-9123456780"
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-medium text-ink">Email</span>
                        <Input
                          {...form.register("email")}
                          className="mt-2"
                          placeholder="patient@example.com"
                        />
                        <p className="mt-2 text-sm text-danger">
                          {form.formState.errors.email?.message}
                        </p>
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-ink">
                          Emergency contact
                        </span>
                        <Input
                          {...form.register("emergencyContact")}
                          className="mt-2"
                          placeholder="Sonal Sharma - +91-9000000000"
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <label className="block sm:col-span-3">
                        <span className="text-sm font-medium text-ink">
                          Address
                        </span>
                        <Textarea
                          {...form.register("address")}
                          className="mt-2 min-h-24"
                          placeholder="Sector 12, Jaipur"
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-ink">City</span>
                        <Input
                          {...form.register("city")}
                          className="mt-2"
                          placeholder="Jaipur"
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-ink">State</span>
                        <Input
                          {...form.register("state")}
                          className="mt-2"
                          placeholder="Rajasthan"
                        />
                      </label>

                      <div className="block">
                        <UploadField
                          description="Optional patient profile image for identification in front-desk workflows."
                          label="Patient photo"
                          onChange={(value) =>
                            form.setValue("photoUrl", value, {
                              shouldDirty: true,
                              shouldValidate: true,
                            })}
                          target="PATIENT_PHOTO"
                          value={photoUrlValue ?? ""}
                        />
                      </div>
                    </div>

                    <label className="block">
                      <span className="text-sm font-medium text-ink">Notes</span>
                      <Textarea
                        {...form.register("notes")}
                        className="mt-2 min-h-28"
                        placeholder="Allergy notes, registration remarks, or follow-up context."
                      />
                      <p className="mt-2 text-sm text-danger">
                        {form.formState.errors.notes?.message}
                      </p>
                    </label>

                    <div className="flex flex-wrap gap-3 pb-6">
                      <Button
                        disabled={isSaving || (!canCreate && !selectedEntry)}
                        type="submit"
                      >
                        {isSaving
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : selectedEntry
                          ? <UserRoundPen className="h-4 w-4" />
                          : <UserRound className="h-4 w-4" />}
                        {selectedEntry ? "Save patient profile" : "Register patient"}
                      </Button>

                      <Button
                        onClick={clearPatientForm}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Clear form
                      </Button>
                    </div>

                    {!selectedEntry
                      ? (
                        <p className="text-sm leading-6 text-ink-soft pb-6">
                          {isOnline
                            ? "New registrations autosave locally and queue on this device if the connection drops before submit."
                            : "You are offline. New registrations will queue on this device and sync after reconnect."}
                        </p>
                      )
                      : null}
                  </form>
                )
                : (
                  <EmptyState
                    className="mt-6 min-h-56 mb-8"
                    description="This route is available to patient viewers, but creating or editing profiles requires patients.create or patients.update."
                    icon={UserRound}
                    title="Read-only patient directory"
                  />
                )}
            </div>
          </DrawerContent>
        </Drawer>

        <SurfaceCard className="patient-directory-panel">
          <div className="management-toolbar-shell">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Searchable patient thread
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                Operational identity records
              </h2>
            </div>

            <label className="management-search-shell">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                className="h-auto min-w-48 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search hospital number, name, phone"
                value={search}
              />
            </label>
          </div>

          <div className="mt-6">
            <BulkActionToolbar
              count={selectedEntries.length}
              itemLabel="patient"
              onClear={clearBulkSelection}
            >
              <Button
                onClick={() => exportSelectedPatients("csv")}
                size="sm"
                type="button"
                variant="outline"
              >
                <Download className="h-4 w-4" />
                CSV
              </Button>
              <Button
                onClick={() => exportSelectedPatients("xls")}
                size="sm"
                type="button"
                variant="outline"
              >
                <Download className="h-4 w-4" />
                Excel
              </Button>
              <Button
                onClick={() => exportSelectedPatients("json")}
                size="sm"
                type="button"
                variant="outline"
              >
                <Download className="h-4 w-4" />
                JSON
              </Button>
              <Button
                onClick={() => exportSelectedPatients("print")}
                size="sm"
                type="button"
                variant="outline"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
              {canUpdate
                ? (
                  <Button
                    disabled={isBulkDeleting}
                    onClick={() => void handleBulkDelete()}
                    size="sm"
                    type="button"
                    variant="destructive"
                  >
                    {isBulkDeleting
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Trash2 className="h-4 w-4" />}
                    Delete selected
                  </Button>
                )
                : null}
            </BulkActionToolbar>
          </div>

          <div className="mt-6 space-y-4">
            {directoryQuery.isLoading
              ? (
                <div className="management-subtle-card flex items-center gap-3 px-4 py-5 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  Loading patient records
                </div>
              )
              : null}

            {!directoryQuery.isLoading && entries.length === 0
              ? (
                <EmptyState
                  description="No patient records match the current search. Register the first patient to start appointment and billing flows from a real patient thread."
                  icon={UserRound}
                  title="No patient records found"
                />
              )
              : null}

            {entries.map((entry) => (
              <article
                key={entry.id}
                className="management-record-shell p-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="management-selection-pill inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        <Checkbox
                          checked={selectedIds.includes(entry.id)}
                          onChange={() => toggleSelection(entry.id)}
                        />
                        Select
                      </label>
                      {entry.photoUrl
                        ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={entry.fullName}
                            className="h-11 w-11 rounded-full border border-border/70 object-cover"
                            src={entry.photoUrl}
                          />
                        )
                        : (
                          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-muted text-sm font-semibold text-foreground">
                            {entry.firstName.slice(0, 1)}
                          </span>
                        )}
                      <h3 className="text-xl font-semibold text-foreground">
                        {entry.fullName}
                      </h3>
                      <Badge variant="outline">
                        {entry.hospitalNumber}
                      </Badge>
                      <Badge variant="secondary">
                        {entry.gender}
                      </Badge>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="management-metric px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Contact
                        </p>
                        <p className="mt-2 text-sm text-foreground">
                          {entry.phone || "Primary phone not added"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {entry.email || "Email not added"}
                        </p>
                      </div>

                      <div className="management-metric px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Profile
                        </p>
                        <p className="mt-2 text-sm text-foreground">
                          {entry.ageLabel || "DOB not captured"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {entry.bloodGroup || "Blood group not captured"}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm leading-6 text-muted-foreground">
                      {formatPatientLocation(entry)}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 xl:items-end">
                    <p className="text-sm text-muted-foreground">
                      Updated {formatDateTime(entry.updatedAt)}
                    </p>
                    {canUpdate
                      ? (
                        <OptionsMenu
                          items={[
                            {
                              icon: UserRoundPen,
                              label: "Edit profile",
                              onSelect: () => beginEditing(entry),
                            },
                            {
                              icon: Trash2,
                              label: "Delete patient",
                              onSelect: () => handleDelete(entry),
                              tone: "danger",
                            },
                          ]}
                        />
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
                <label className="management-selection-pill inline-flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
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
      </section>
    </div>
  );
}
