"use client";

import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  AlertTriangle,
  BadgePlus,
  Download,
  Eye,
  Loader2,
  MapPin,
  Phone,
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
import { NativeImage } from "@/components/ui/native-image";
import { Checkbox } from "@/components/ui/checkbox";
import { FormDrawer, FormDrawerSection } from "@/components/ui/form-drawer";
import { Input } from "@/components/ui/input";
import {
  RecordPreviewDialog,
  RecordPreviewField,
  RecordPreviewSection,
} from "@/components/ui/record-preview-dialog";
import { SurfaceCard } from "@/components/ui/surface-card";
import { PageHeader } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import { ThemedSelect } from "@/components/ui/themed-select";
import { useConfirmationDialog } from "@/hooks/useConfirmationDialog";
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
const patientFormId = "patient-management-form";

function formatDateTime(value: string) {
  return format(new Date(value), "dd MMM yyyy, hh:mm a");
}

function formatPatientLocation(patient: PatientRecord) {
  const location = [patient.city, patient.state].filter(Boolean).join(", ");
  return location || patient.address || "Address not added";
}

type PatientManagementProps = {
  hideHeader?: boolean;
  defaultCreateOpen?: boolean;
};

export function PatientManagement({
  hideHeader = false,
  defaultCreateOpen = false,
}: PatientManagementProps) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") ?? "";
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(defaultCreateOpen);
  const [selectedEntry, setSelectedEntry] = useState<PatientRecord | null>(
    null,
  );
  const [previewEntry, setPreviewEntry] = useState<PatientRecord | null>(null);
  const deferredSearch = useDebouncedSearch(search);

  const { canAccess: canCreate } = useModuleAccess(["patients.create"]);
  const { canAccess: canUpdate } = useModuleAccess(["patients.update"]);
  const directoryQuery = usePatientDirectory({ q: deferredSearch });
  const createMutation = useCreatePatient();
  const deleteMutation = useDeletePatient();
  const updateMutation = useUpdatePatient();
  const confirm = useConfirmationDialog();
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

  function openPreview(entry: PatientRecord) {
    startTransition(() => setPreviewEntry(entry));
  }

  function closePreview() {
    startTransition(() => setPreviewEntry(null));
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

  async function handleDelete(entry: PatientRecord) {
    if (!canUpdate) {
      return;
    }

    const confirmed = await confirm({
      title: "Delete patient record?",
      description:
        `Delete ${entry.fullName}? Patients linked to appointments, admissions, billing, consents, or communications cannot be deleted.`,
      confirmLabel: "Delete patient",
      tone: "danger",
    });

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

    const confirmed = await confirm({
      title: "Delete selected patients?",
      description:
        `Delete ${selectedEntries.length} selected patients? Linked records will be skipped.`,
      confirmLabel: "Delete selected",
      tone: "danger",
    });

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
          {
            label: "Registered patients",
            value: summary?.total ?? 0,
            detail: "Master directory size",
            icon: UserRound,
            tone: "primary",
          },
          {
            label: "Added this week",
            value: summary?.addedThisWeek ?? 0,
            detail: "Fresh registration load",
            icon: BadgePlus,
            tone: "accent",
          },
          {
            label: "Primary phones",
            value: summary?.withPrimaryPhone ?? 0,
            detail: "Ready for reminder flows",
            icon: Phone,
            tone: "success",
          },
          {
            label: "Needs completion",
            value: summary?.missingCriticalProfile ?? 0,
            detail: "Missing phone or date of birth",
            icon: AlertTriangle,
            tone: "warning",
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <SurfaceCard key={item.label}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                    item.tone === "accent"
                      ? "bg-accent text-accent-foreground"
                      : item.tone === "success"
                      ? "bg-success/14 text-success"
                      : item.tone === "warning"
                      ? "bg-warning/16 text-warning"
                      : "bg-primary/12 text-primary"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                {item.value}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.detail}</p>
            </SurfaceCard>
          );
        })}
      </section>

      <section className="patient-main-grid space-y-6">
        <FormDrawer
          contentClassName="pb-0"
          description={selectedEntry
            ? `Update ${selectedEntry.fullName} without losing the directory context.`
            : "Capture the patient identity once so appointments, billing, and admissions remain attached to the same thread."}
          footer={canManagePatients
            ? (
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="management-selection-pill px-4 py-3 text-sm leading-6 text-muted-foreground">
                  {selectedEntry
                    ? "Changes flow back into the live patient master immediately."
                    : isOnline
                    ? "New registrations autosave locally and queue on this device if connectivity drops before submit."
                    : "You are offline. New registrations will queue on this device and sync after reconnect."}
                </div>
                <div className="flex flex-wrap justify-end gap-3">
                  {selectedEntry
                    ? (
                      <Button
                        onClick={() => handleDelete(selectedEntry)}
                        size="sm"
                        type="button"
                        variant="destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete patient
                      </Button>
                    )
                    : null}
                  <Button
                    onClick={clearPatientForm}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {selectedEntry ? "Cancel edit" : "Clear form"}
                  </Button>
                  <Button
                    disabled={isSaving || (!canCreate && !selectedEntry)}
                    form={patientFormId}
                    type="submit"
                  >
                    {isSaving
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : selectedEntry
                      ? <UserRoundPen className="h-4 w-4" />
                      : <UserRound className="h-4 w-4" />}
                    {selectedEntry ? "Save patient profile" : "Register patient"}
                  </Button>
                </div>
              </div>
            )
            : null}
          mode={selectedEntry ? "edit" : "create"}
          onOpenChange={(open) => {
            setIsDrawerOpen(open);
            if (!open) {
              clearSelection();
            }
          }}
          open={isDrawerOpen}
          statusLabel={selectedEntry?.hospitalNumber}
          title={selectedEntry ? "Edit patient profile" : "Register patient"}
        >
          {!selectedEntry && drafts.patientRegistration
            ? (
              <OfflineDraftPanel
                description="This registration draft is stored locally in the browser, so reception can recover it after a refresh or connection drop."
                isOnline={isOnline}
                onDiscard={discardDraft}
                onRestore={restoreDraft}
                title="Saved patient registration draft"
                updatedAt={drafts.patientRegistration.updatedAt}
              />
            )
            : null}

          {canManagePatients
            ? (
              <form
                className="space-y-5"
                id={patientFormId}
                onSubmit={form.handleSubmit(handleSubmit)}
              >
                <FormDrawerSection
                  description="Capture the core identity once so every downstream workflow stays attached to the correct patient."
                  title="Identity and registration"
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
                </FormDrawerSection>

                <FormDrawerSection
                  description="Keep communication channels current for reminders, billing, and emergency workflows."
                  title="Contact and emergency details"
                >
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
                </FormDrawerSection>

                <FormDrawerSection
                  description="Complete the address and keep any clinically relevant administrative notes with the patient record."
                  title="Address and notes"
                >
                  <label className="block">
                    <span className="text-sm font-medium text-ink">
                      Address
                    </span>
                    <Textarea
                      {...form.register("address")}
                      className="mt-2 min-h-24"
                      placeholder="Sector 12, Jaipur"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
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
                </FormDrawerSection>
              </form>
            )
            : (
              <EmptyState
                className="min-h-56"
                description="This route is available to patient viewers, but creating or editing profiles requires patients.create or patients.update."
                icon={UserRound}
                title="Read-only patient directory"
              />
            )}
        </FormDrawer>

        <RecordPreviewDialog
          actions={canUpdate && previewEntry
            ? (
              <Button
                onClick={() => {
                  closePreview();
                  beginEditing(previewEntry);
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <UserRoundPen className="h-4 w-4" />
                Edit patient
              </Button>
            )
            : null}
          description="Review the patient thread before starting appointments, billing, or admission actions."
          eyebrow="Patient profile"
          onOpenChange={(open) => {
            if (!open) {
              closePreview();
            }
          }}
          open={Boolean(previewEntry)}
          status={previewEntry ? <Badge variant="outline">{previewEntry.hospitalNumber}</Badge> : null}
          title={previewEntry?.fullName ?? "Patient profile"}
        >
          {previewEntry ? (
            <>
              <SurfaceCard className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {previewEntry.photoUrl
                    ? (
                      <NativeImage
                        alt={previewEntry.fullName}
                        className="h-20 w-20 rounded-3xl border border-border/70 object-cover"
                        src={previewEntry.photoUrl}
                      />
                    )
                    : (
                      <span className="flex h-20 w-20 items-center justify-center rounded-3xl border border-border/70 bg-muted text-2xl font-semibold text-foreground">
                        {previewEntry.firstName.slice(0, 1)}
                      </span>
                    )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{previewEntry.gender}</Badge>
                      <Badge variant="outline">
                        {previewEntry.ageLabel ?? "DOB not captured"}
                      </Badge>
                      <Badge variant={previewEntry.phone ? "success" : "warning"}>
                        {previewEntry.phone ? "Contact ready" : "Phone missing"}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      Updated {formatDateTime(previewEntry.updatedAt)}
                    </p>
                  </div>
                </div>
              </SurfaceCard>

              <RecordPreviewSection
                description="Core identity fields used by downstream scheduling, billing, and admission workflows."
                icon={UserRound}
                title="Identity"
              >
                <RecordPreviewField label="Hospital number" value={previewEntry.hospitalNumber} />
                <RecordPreviewField label="Blood group" value={previewEntry.bloodGroup || "Not captured"} />
                <RecordPreviewField label="Date of birth" value={previewEntry.dateOfBirth || "Not captured"} />
                <RecordPreviewField label="Age label" value={previewEntry.ageLabel || "Not available"} />
              </RecordPreviewSection>

              <RecordPreviewSection
                description="Primary and backup channels that support appointment and reminder workflows."
                icon={Phone}
                title="Contact details"
              >
                <RecordPreviewField label="Primary phone" value={previewEntry.phone || "Not captured"} />
                <RecordPreviewField label="Alternate phone" value={previewEntry.alternatePhone || "Not captured"} />
                <RecordPreviewField label="Email" value={previewEntry.email || "Not captured"} />
                <RecordPreviewField label="Emergency contact" value={previewEntry.emergencyContact || "Not captured"} />
              </RecordPreviewSection>

              <RecordPreviewSection
                description="Residential context and operational notes available to the front desk and billing teams."
                icon={MapPin}
                title="Address and notes"
              >
                <RecordPreviewField label="Location" value={formatPatientLocation(previewEntry)} />
                <RecordPreviewField label="Address" value={previewEntry.address || "Not captured"} />
                <RecordPreviewField
                  className="md:col-span-2"
                  label="Notes"
                  value={previewEntry.notes || "No notes captured"}
                />
              </RecordPreviewSection>
            </>
          ) : null}
        </RecordPreviewDialog>

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
                          <NativeImage
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
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <Button
                        onClick={() => openPreview(entry)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      {canUpdate
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
                              onClick={() => void handleDelete(entry)}
                              size="sm"
                              type="button"
                              variant="destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </>
                        )
                        : null}
                    </div>
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
