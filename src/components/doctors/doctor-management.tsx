"use client";

import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Download,
  Loader2,
  Printer,
  RefreshCcw,
  Search,
  Stethoscope,
  Trash2,
  UserRoundPen,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { EmptyState } from "@/components/feedback/empty-state";
import { UploadField } from "@/components/forms/upload-field";
import { BulkActionToolbar } from "@/components/tables/bulk-action-toolbar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { ThemedSelect } from "@/components/ui/themed-select";
import {
  useCreateDoctor,
  useDeleteDoctor,
  useDoctorManagement,
  useUpdateDoctor,
} from "@/hooks/useDoctorsApi";
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
import { createDoctorSchema } from "@/lib/validators/doctors";
import type { BulkActionResponse } from "@/types/bulk";
import type { DoctorManagementRecord } from "@/types/doctor";

type DoctorFormInput = z.input<typeof createDoctorSchema>;
type DoctorFormValues = z.output<typeof createDoctorSchema>;

const defaultDoctorValues: DoctorFormInput = {
  fullName: "",
  designation: "",
  specialty: "",
  consultationFee: 0,
  departmentName: "",
  email: "",
  phone: "",
  signatureUrl: "",
  active: true,
};

function formatCurrency(value: number) {
  return `Rs ${value.toFixed(0)}`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "No appointments yet";
  }

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type DoctorManagementProps = {
  hideHeader?: boolean;
};

export function DoctorManagement({ hideHeader = false }: DoctorManagementProps) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") ?? "";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">(
    "ALL",
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorManagementRecord | null>(
    null,
  );

  const deferredSearch = useDebouncedSearch(search);
  const { canAccess: canManage } = useModuleAccess(["doctors.manage"]);
  const doctorQuery = useDoctorManagement({
    q: deferredSearch,
    status: statusFilter,
  });
  const createDoctorMutation = useCreateDoctor();
  const updateDoctorMutation = useUpdateDoctor();
  const deleteDoctorMutation = useDeleteDoctor();
  const isSaving = createDoctorMutation.isPending || updateDoctorMutation.isPending;

  const form = useForm<DoctorFormInput, unknown, DoctorFormValues>({
    resolver: zodResolver(createDoctorSchema),
    defaultValues: defaultDoctorValues,
  });
  const signatureUrlValue = useWatch({
    control: form.control,
    name: "signatureUrl",
    defaultValue: defaultDoctorValues.signatureUrl,
  });

  useEffect(() => {
    setSearch(queryParam);
  }, [queryParam]);

  useEffect(() => {
    if (!selectedDoctor) {
      form.reset(defaultDoctorValues);
      return;
    }

    form.reset({
      fullName: selectedDoctor.fullName,
      designation: selectedDoctor.designation ?? "",
      specialty: selectedDoctor.specialty ?? "",
      consultationFee: selectedDoctor.consultationFee,
      departmentName: selectedDoctor.departmentName ?? "",
      email: selectedDoctor.email ?? "",
      phone: selectedDoctor.phone ?? "",
      signatureUrl: selectedDoctor.signatureUrl ?? "",
      active: selectedDoctor.active,
    });
  }, [form, selectedDoctor]);

  const entries = useMemo(
    () => doctorQuery.data?.entries ?? [],
    [doctorQuery.data?.entries],
  );
  const summary = doctorQuery.data?.summary;
  const departmentSuggestions = useMemo(() =>
    (doctorQuery.data?.directories.departments ?? []).map((department) =>
      department.name
    ), [doctorQuery.data?.directories.departments]);
  const selectedEntries = entries.filter((entry) => selectedIds.includes(entry.id));
  const allVisibleSelected = entries.length > 0 &&
    entries.every((entry) => selectedIds.includes(entry.id));
  const doctorExportColumns: ExportColumn<DoctorManagementRecord>[] = [
    { key: "fullName", label: "Doctor", value: (entry) => entry.fullName },
    {
      key: "designation",
      label: "Designation",
      value: (entry) => entry.designation,
    },
    {
      key: "specialty",
      label: "Specialty",
      value: (entry) => entry.specialty,
    },
    {
      key: "department",
      label: "Department",
      value: (entry) => entry.departmentName,
    },
    {
      key: "consultationFee",
      label: "Consultation Fee",
      value: (entry) => formatCurrency(entry.consultationFee),
    },
    {
      key: "active",
      label: "Active",
      value: (entry) => (entry.active ? "Yes" : "No"),
    },
    {
      key: "appointments",
      label: "Appointments",
      value: (entry) => entry.totalAppointments,
    },
    {
      key: "lastAppointmentAt",
      label: "Last Activity",
      value: (entry) => formatDateTime(entry.lastAppointmentAt),
    },
  ];

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) => entries.some((entry) => entry.id === id))
    );
  }, [entries]);

  function clearSelection() {
    startTransition(() => setSelectedDoctor(null));
  }

  function handleSubmit(values: DoctorFormValues) {
    if (selectedDoctor) {
      updateDoctorMutation.mutate(
        {
          id: selectedDoctor.id,
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

    createDoctorMutation.mutate(values, {
      onSuccess: () => {
        form.reset(defaultDoctorValues);
      },
    });
  }

  function handleDelete(entry: DoctorManagementRecord) {
    if (
      !window.confirm(
        `Delete ${entry.fullName}? Doctors linked to appointments or admissions cannot be deleted.`,
      )
    ) {
      return;
    }

    deleteDoctorMutation.mutate(
      { id: entry.id },
      {
        onSuccess: () => {
          if (selectedDoctor?.id === entry.id) {
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

  async function handleBulkActiveUpdate(active: boolean) {
    if (!canManage || selectedEntries.length === 0) {
      return;
    }

    setIsBulkUpdating(true);

    try {
      const result = (
        await apiClient.post<BulkActionResponse>("/api/doctors/bulk", {
          action: "active",
          ids: selectedEntries.map((entry) => entry.id),
          active,
        })
      ).data;

      await queryClient.invalidateQueries({ queryKey: ["doctor-management"] });
      await queryClient.invalidateQueries({ queryKey: ["doctors"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] });
      clearBulkSelection();
      if (result.successCount > 0) {
        toast.success(`${result.successCount} doctors updated.`);
      }
      if (result.failedCount > 0) {
        toast.error(`${result.failedCount} doctors could not be updated.`);
      }
    } finally {
      setIsBulkUpdating(false);
    }
  }

  async function handleBulkDelete() {
    if (!canManage || selectedEntries.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedEntries.length} selected doctors? Doctors linked to appointments or admissions will be skipped.`,
    );

    if (!confirmed) {
      return;
    }

    setIsBulkUpdating(true);

    try {
      const result = (
        await apiClient.post<BulkActionResponse>("/api/doctors/bulk", {
          action: "delete",
          ids: selectedEntries.map((entry) => entry.id),
        })
      ).data;

      await queryClient.invalidateQueries({ queryKey: ["doctor-management"] });
      await queryClient.invalidateQueries({ queryKey: ["doctors"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] });

      if (selectedDoctor && result.successIds.includes(selectedDoctor.id)) {
        clearSelection();
      }

      clearBulkSelection();
      if (result.successCount > 0) {
        toast.success(`Deleted ${result.successCount} doctors.`);
      }
      if (result.failedCount > 0) {
        toast.error(`${result.failedCount} doctors could not be deleted.`);
      }
    } finally {
      setIsBulkUpdating(false);
    }
  }

  function exportSelectedDoctors(format: "csv" | "json" | "xls" | "print") {
    if (selectedEntries.length === 0) {
      return;
    }

    const filenameBase = `doctors-${new Date().toISOString().slice(0, 10)}`;

    if (format === "csv") {
      downloadCsv(`${filenameBase}.csv`, selectedEntries, doctorExportColumns);
      return;
    }

    if (format === "json") {
      downloadJson(`${filenameBase}.json`, selectedEntries);
      return;
    }

    if (format === "xls") {
      downloadExcelHtml(
        `${filenameBase}.xls`,
        "Doctor Directory Export",
        selectedEntries,
        doctorExportColumns,
      );
      return;
    }

    openPrintTable("Doctor Directory Export", selectedEntries, doctorExportColumns);
  }

  return (
    <div className="space-y-6">
      {hideHeader
        ? null
        : (
          <PageHeader
            eyebrow="Phase 3 medical masters"
            title="Doctor management"
            description="Maintain the doctor directory that powers appointments, IPD admissions, billing consultation context, analytics, and reports."
            actions={
              <Button
                onClick={() => void doctorQuery.refetch()}
                size="sm"
                type="button"
                variant="outline"
              >
                {doctorQuery.isFetching
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <RefreshCcw className="h-4 w-4" />}
                Refresh
              </Button>
            }
          />
        )}

      <section className="grid gap-4 xl:grid-cols-4">
        {[
          ["Doctors", summary?.total ?? 0, "Visible in the master directory"],
          ["Active", summary?.active ?? 0, "Available for scheduling"],
          ["Inactive", summary?.inactive ?? 0, "Hidden from new appointments"],
          ["Departments", summary?.departments ?? 0, "Reusable master categories"],
        ].map(([label, value, detail]) => (
          <SurfaceCard key={String(label)}>
            <p className="text-sm text-ink-soft">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">
              {value}
            </p>
            <p className="mt-3 text-sm leading-6 text-ink-soft">{detail}</p>
          </SurfaceCard>
        ))}
      </section>

      <section className="grid gap-6 2xl:grid-cols-[0.92fr_1.08fr]">
        <SurfaceCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Doctor master
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                {selectedDoctor
                  ? `Edit ${selectedDoctor.fullName}`
                  : "Add a doctor"}
              </h2>
            </div>
            {selectedDoctor
              ? (
                <Button
                  onClick={clearSelection}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Clear form
                </Button>
              )
              : null}
          </div>

          {canManage
            ? (
              <form
                className="mt-6 space-y-5"
                onSubmit={form.handleSubmit(handleSubmit)}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="text-sm font-medium text-ink">Doctor name</span>
                    <Input
                      {...form.register("fullName")}
                      className="mt-2"
                      placeholder="Dr. Karina Safar"
                    />
                    <p className="mt-2 text-sm text-danger">
                      {form.formState.errors.fullName?.message}
                    </p>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-ink">Designation</span>
                    <Input
                      {...form.register("designation")}
                      className="mt-2"
                      placeholder="Consultant Physician"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-ink">Specialty</span>
                    <Input
                      {...form.register("specialty")}
                      className="mt-2"
                      placeholder="Cardiology"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-ink">Department</span>
                    <Input
                      {...form.register("departmentName")}
                      className="mt-2"
                      list="doctor-departments"
                      placeholder="Cardiology"
                    />
                    <datalist id="doctor-departments">
                      {departmentSuggestions.map((departmentName) => (
                        <option key={departmentName} value={departmentName} />
                      ))}
                    </datalist>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-ink">Consultation fee</span>
                    <Input
                      {...form.register("consultationFee")}
                      className="mt-2"
                      min="0"
                      step="0.01"
                      type="number"
                    />
                    <p className="mt-2 text-sm text-danger">
                      {form.formState.errors.consultationFee?.message}
                    </p>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-ink">Email</span>
                    <Input
                      {...form.register("email")}
                      className="mt-2"
                      placeholder="doctor@hospital.test"
                    />
                    <p className="mt-2 text-sm text-danger">
                      {form.formState.errors.email?.message}
                    </p>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-ink">Phone</span>
                    <Input
                      {...form.register("phone")}
                      className="mt-2"
                      placeholder="+91-9876543210"
                    />
                  </label>
                </div>

                <UploadField
                  description="Used for printed documents and signature-supported clinical workflows."
                  label="Doctor signature"
                  onChange={(value) =>
                    form.setValue("signatureUrl", value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })}
                  target="DOCTOR_SIGNATURE"
                  value={signatureUrlValue ?? ""}
                />

                <label className="glass-panel-muted inline-flex items-center gap-3 rounded-full px-4 py-3 text-sm text-ink">
                  <Checkbox {...form.register("active")} />
                  Available for new appointments and admissions
                </label>

                <div className="flex flex-wrap gap-3">
                  <Button disabled={isSaving} type="submit">
                    {isSaving
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : selectedDoctor
                      ? <UserRoundPen className="h-4 w-4" />
                      : <Stethoscope className="h-4 w-4" />}
                    {selectedDoctor ? "Save doctor" : "Create doctor"}
                  </Button>
                  <Button
                    onClick={clearSelection}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Reset
                  </Button>
                  {selectedDoctor
                    ? (
                      <Button
                        disabled={deleteDoctorMutation.isPending}
                        onClick={() => handleDelete(selectedDoctor)}
                        size="sm"
                        type="button"
                        variant="destructive"
                      >
                        {deleteDoctorMutation.isPending
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />}
                        Delete doctor
                      </Button>
                    )
                    : null}
                </div>
              </form>
            )
            : (
              <EmptyState
                className="mt-6 min-h-56"
                description="Viewing doctors requires doctors.view. Editing them requires doctors.manage."
                icon={Stethoscope}
                title="Doctor master is read-only"
              />
            )}
        </SurfaceCard>

        <SurfaceCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Doctor directory
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                Scheduling and admission roster
              </h2>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="glass-panel-muted flex items-center gap-3 rounded-[24px] px-4 py-3 text-sm text-ink-soft">
                <Search className="h-4 w-4 text-brand" />
                <Input
                  className="h-auto min-w-44 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search doctor, specialty, department"
                  value={search}
                />
              </label>

              <ThemedSelect
                className="glass-panel-muted rounded-full py-3 font-medium"
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
              itemLabel="doctor"
              onClear={clearBulkSelection}
            >
              <Button
                onClick={() => exportSelectedDoctors("csv")}
                size="sm"
                type="button"
                variant="outline"
              >
                <Download className="h-4 w-4" />
                CSV
              </Button>
              <Button
                onClick={() => exportSelectedDoctors("xls")}
                size="sm"
                type="button"
                variant="outline"
              >
                <Download className="h-4 w-4" />
                Excel
              </Button>
              <Button
                onClick={() => exportSelectedDoctors("json")}
                size="sm"
                type="button"
                variant="outline"
              >
                <Download className="h-4 w-4" />
                JSON
              </Button>
              <Button
                onClick={() => exportSelectedDoctors("print")}
                size="sm"
                type="button"
                variant="outline"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
              {canManage
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
            {doctorQuery.isLoading
              ? (
                <div className="glass-panel-muted flex items-center gap-3 rounded-[24px] px-4 py-5 text-sm text-ink-soft">
                  <Loader2 className="h-4 w-4 animate-spin text-brand" />
                  Loading doctor directory
                </div>
              )
              : null}

            {!doctorQuery.isLoading && entries.length === 0
              ? (
                <EmptyState
                  description="No doctors match the current filters."
                  icon={Stethoscope}
                  title="No doctors found"
                />
              )
              : null}

            {entries.map((entry) => (
              <article
                className="glass-panel-muted rounded-[24px] p-4"
                key={entry.id}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
                        {entry.fullName}
                      </h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                        entry.active
                          ? "bg-[rgba(21,128,61,0.12)] text-success"
                          : "bg-[rgba(20,32,51,0.08)] text-ink-soft"
                      }`}>
                        {entry.active ? "Active" : "Inactive"}
                      </span>
                      <span className="glass-chip rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                        {formatCurrency(entry.consultationFee)}
                      </span>
                      {entry.signatureUrl
                        ? (
                          <span className="glass-chip rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                            Signature on file
                          </span>
                        )
                        : null}
                    </div>
                    <p className="mt-3 text-sm text-ink-soft">
                      {[entry.designation, entry.specialty, entry.departmentName]
                        .filter(Boolean)
                        .join(" / ") || "Department not assigned"}
                    </p>
                    <p className="mt-2 text-sm text-ink-soft">
                      {entry.totalAppointments} appointments / last activity{" "}
                      {formatDateTime(entry.lastAppointmentAt)}
                    </p>
                  </div>

                  {canManage
                    ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => startTransition(() => setSelectedDoctor(entry))}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <UserRoundPen className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          disabled={deleteDoctorMutation.isPending}
                          onClick={() => handleDelete(entry)}
                          size="sm"
                          type="button"
                          variant="destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
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
      </section>
    </div>
  );
}
