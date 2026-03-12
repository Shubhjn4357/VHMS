"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  BedDouble,
  ClipboardPlus,
  Loader2,
  RefreshCcw,
  Search,
  Shuffle,
  Sparkles,
  UserMinus,
  Wrench,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { BED_STATUS, type BedStatus } from "@/constants/bedStatus";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { ThemedSelect } from "@/components/ui/themed-select";
import { useAppointmentDirectory } from "@/hooks/useAppointmentsApi";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { useDoctorLookup } from "@/hooks/useDoctorsApi";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import {
  useAssignBed,
  useDischargeAdmission,
  useOccupancyBoard,
  useTransferAdmission,
  useUpdateBedStatus,
} from "@/hooks/useOccupancyApi";
import { usePatientDirectory } from "@/hooks/usePatientsApi";
import { createOccupancyAssignmentSchema } from "@/lib/validators/occupancy";
import type { OccupancyBedRecord } from "@/types/occupancy";

type AssignmentFormValues = z.infer<typeof createOccupancyAssignmentSchema>;

const defaultAssignmentValues: AssignmentFormValues = {
  patientId: "",
  bedId: "",
  attendingDoctorId: "",
  admittedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
};

const statusToneMap: Record<BedStatus, string> = {
  FREE: "border-[rgba(21,128,61,0.18)] bg-[rgba(21,128,61,0.10)] text-success",
  OCCUPIED:
    "border-[rgba(220,38,38,0.16)] bg-[rgba(220,38,38,0.10)] text-danger",
  RESERVED:
    "border-[rgba(21,94,239,0.16)] bg-[rgba(21,94,239,0.10)] text-accent",
  CLEANING:
    "border-[rgba(217,119,6,0.18)] bg-[rgba(217,119,6,0.10)] text-warning",
  MAINTENANCE: "border-[rgba(20,32,51,0.12)] bg-[rgba(20,32,51,0.08)] text-ink",
  BLOCKED:
    "border-[rgba(124,58,237,0.16)] bg-[rgba(124,58,237,0.10)] text-[rgb(109,40,217)]",
};

const editableBedStatuses = BED_STATUS.filter(
  (status) => status !== "OCCUPIED",
) as Exclude<BedStatus, "OCCUPIED">[];

function isAssignableBed(bed: OccupancyBedRecord) {
  return !bed.admissionId && ["FREE", "RESERVED"].includes(bed.status);
}

function formatCurrency(value?: number | null) {
  if (!value) {
    return "Rs 0";
  }

  return `Rs ${value.toFixed(0)}`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return format(new Date(value), "dd MMM yyyy, hh:mm a");
}

function getOccupancyPercent(occupied: number, total: number) {
  if (total === 0) {
    return "0%";
  }

  return `${Math.round((occupied / total) * 100)}%`;
}

type OccupancyManagementProps = {
  hideHeader?: boolean;
};

export function OccupancyManagement({ hideHeader = false }: OccupancyManagementProps) {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") ?? "";
  const sourceAppointmentParam = searchParams.get("sourceAppointmentId") ?? "";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BedStatus | "ALL">("ALL");
  const [wardFilter, setWardFilter] = useState("");
  const [sourceAppointmentId, setSourceAppointmentId] = useState("");
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [transferTargetBedId, setTransferTargetBedId] = useState("");
  const [manualStatusBedId, setManualStatusBedId] = useState<string | null>(
    null,
  );
  const [manualStatus, setManualStatus] = useState<
    Exclude<BedStatus, "OCCUPIED">
  >("FREE");
  const deferredSearch = useDebouncedSearch(search);

  const { canAccess: canManage } = useModuleAccess(["occupancy.manage"]);
  const appointmentQuery = useAppointmentDirectory();
  const occupancyInventoryQuery = useOccupancyBoard();
  const occupancyQuery = useOccupancyBoard({
    q: deferredSearch,
    wardId: wardFilter || undefined,
    status: statusFilter,
  });
  const patientQuery = usePatientDirectory();
  const doctorQuery = useDoctorLookup();
  const assignMutation = useAssignBed();
  const transferMutation = useTransferAdmission();
  const dischargeMutation = useDischargeAdmission();
  const updateStatusMutation = useUpdateBedStatus();

  useEffect(() => {
    setSearch(queryParam);
  }, [queryParam]);

  useEffect(() => {
    if (!sourceAppointmentParam) {
      return;
    }

    setSourceAppointmentId(sourceAppointmentParam);
  }, [sourceAppointmentParam]);

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(createOccupancyAssignmentSchema),
    defaultValues: defaultAssignmentValues,
  });

  const inventoryWards = occupancyInventoryQuery.data?.wards ?? [];
  const wards = occupancyQuery.data?.wards ?? [];
  const summary = occupancyQuery.data?.summary;
  const appointmentEntries = (appointmentQuery.data?.entries ?? []).filter((entry) =>
    !["CANCELLED", "NO_SHOW"].includes(entry.status)
  );
  const selectedSourceAppointment = appointmentEntries.find((entry) =>
    entry.id === sourceAppointmentId
  );
  const inventoryBeds = inventoryWards.flatMap((ward) =>
    ward.rooms.flatMap((room) => room.beds)
  );
  const selectedBed = inventoryBeds.find((bed) => bed.id === selectedBedId) ??
    null;
  const availableBeds = inventoryBeds.filter(isAssignableBed);
  const transferTargets = inventoryBeds.filter((bed) =>
    isAssignableBed(bed) && bed.id !== selectedBed?.id
  );
  const activePatientIds = new Set(
    inventoryBeds.map((bed) => bed.patientId).filter(Boolean) as string[],
  );
  const patients = (patientQuery.data?.entries ?? []).filter((patient) =>
    !activePatientIds.has(patient.id)
  );
  const doctors = doctorQuery.data?.entries ?? [];
  const isMutating = assignMutation.isPending || transferMutation.isPending ||
    dischargeMutation.isPending || updateStatusMutation.isPending;
  const effectiveManualStatus = selectedBed && selectedBed.status !== "OCCUPIED"
    ? manualStatusBedId === selectedBed.id ? manualStatus : selectedBed.status
    : "FREE";

  useEffect(() => {
    if (selectedBed && isAssignableBed(selectedBed)) {
      form.setValue("bedId", selectedBed.id);
    }
  }, [form, selectedBed]);

  useEffect(() => {
    if (!selectedSourceAppointment) {
      return;
    }

    form.setValue("patientId", selectedSourceAppointment.patientId, {
      shouldDirty: true,
    });
    form.setValue("attendingDoctorId", selectedSourceAppointment.doctorId, {
      shouldDirty: true,
    });
  }, [form, selectedSourceAppointment]);

  function selectBed(bed: OccupancyBedRecord | null) {
    startTransition(() => setSelectedBedId(bed?.id ?? null));
    setTransferTargetBedId("");

    if (bed && bed.status !== "OCCUPIED") {
      setManualStatus(bed.status);
      setManualStatusBedId(bed.id);
    }
  }

  function handleAssign(values: AssignmentFormValues) {
    assignMutation.mutate(values, {
      onSuccess: (bed) => {
        selectBed(bed);
        setSourceAppointmentId("");
        form.reset({
          ...defaultAssignmentValues,
          bedId: "",
          attendingDoctorId: values.attendingDoctorId,
        });
      },
    });
  }

  function handleTransfer() {
    if (!selectedBed?.admissionId || !transferTargetBedId) {
      return;
    }

    transferMutation.mutate(
      {
        id: selectedBed.admissionId,
        targetBedId: transferTargetBedId,
      },
      {
        onSuccess: (bed) => {
          selectBed(bed);
        },
      },
    );
  }

  function handleDischarge() {
    if (!selectedBed?.admissionId) {
      return;
    }

    dischargeMutation.mutate({
      id: selectedBed.admissionId,
    }, {
      onSuccess: (bed) => {
        selectBed(bed);
      },
    });
  }

  function handleManualStatusUpdate() {
    if (!selectedBed || selectedBed.admissionId) {
      return;
    }

    updateStatusMutation.mutate({
      id: selectedBed.id,
      status: effectiveManualStatus,
    });
  }

  return (
    <div className="space-y-6">
      {hideHeader
        ? null
        : (
          <PageHeader
            eyebrow="Phase 3 IPD live board"
            title="Ward occupancy and bed movement"
            description="This slice turns beds into operational records: admissions bind patients to real beds, nurses can transfer or discharge through controlled actions, and housekeeping status stays visible across wards and rooms."
            actions={
              <Button
                onClick={() => {
                  void occupancyQuery.refetch();
                  void occupancyInventoryQuery.refetch();
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                {occupancyQuery.isFetching || occupancyInventoryQuery.isFetching
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <RefreshCcw className="h-4 w-4" />}
                Refresh
              </Button>
            }
          />
        )}

      <section className="grid gap-4 xl:grid-cols-6">
        {[
          ["Beds", summary?.totalBeds ?? 0, "Total bed inventory"],
          [
            "Occupied",
            summary?.occupiedBeds ?? 0,
            `${
              getOccupancyPercent(
                summary?.occupiedBeds ?? 0,
                summary?.totalBeds ?? 0,
              )
            } live utilization`,
          ],
          ["Free", summary?.availableBeds ?? 0, "Immediately assignable"],
          [
            "Admissions",
            summary?.activeAdmissions ?? 0,
            "Currently admitted patients",
          ],
          [
            "Reserved",
            summary?.reservedBeds ?? 0,
            "Held for planned admissions",
          ],
          [
            "Cleaning + blocked",
            (summary?.cleaningBeds ?? 0) + (summary?.blockedBeds ?? 0),
            "Unavailable until cleared",
          ],
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

      <section className="grid gap-6 2xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-6">
          <SurfaceCard>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  Admission desk
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                  Assign a patient to a bed
                </h2>
              </div>
              <div className="rounded-full bg-[rgba(15,118,110,0.12)] px-4 py-2 text-sm font-semibold text-brand">
                {availableBeds.length} beds open
              </div>
            </div>

            {canManage
              ? (
                <form
                  className="mt-6 space-y-5"
                  onSubmit={form.handleSubmit(handleAssign)}
                >
                  <label className="block">
                    <span className="text-sm font-medium text-ink">
                      Source OPD appointment
                    </span>
                    <ThemedSelect
                      className="mt-2"
                      onChange={(event) => setSourceAppointmentId(event.target.value)}
                      value={sourceAppointmentId}
                    >
                      <option value="">Select OPD appointment (optional)</option>
                      {appointmentEntries.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.patientHospitalNumber} - {entry.patientName} / {entry.doctorName}
                        </option>
                      ))}
                    </ThemedSelect>
                    <p className="mt-2 text-sm text-ink-soft">
                      Pick a booked OPD patient to prefill the IPD admission details.
                    </p>
                  </label>

                  {selectedSourceAppointment
                    ? (
                      <div className="glass-panel-muted rounded-[22px] p-4 text-sm text-ink-soft">
                        <p className="font-semibold text-ink">
                          {selectedSourceAppointment.patientName}
                        </p>
                        <p className="mt-2">
                          {selectedSourceAppointment.patientHospitalNumber} / {selectedSourceAppointment.doctorName}
                        </p>
                        <p className="mt-2">
                          Scheduled {formatDateTime(selectedSourceAppointment.scheduledFor)}
                        </p>
                      </div>
                    )
                    : null}

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
                        {patients.map((patient) => (
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
                      <span className="text-sm font-medium text-ink">
                        Attending doctor
                      </span>
                      <ThemedSelect
                        {...form.register("attendingDoctorId")}
                        className="mt-2"
                      >
                        <option value="">Select doctor</option>
                        {doctors.map((doctor) => (
                          <option key={doctor.id} value={doctor.id}>
                            {doctor.fullName}
                            {doctor.departmentName
                              ? ` - ${doctor.departmentName}`
                              : ""}
                          </option>
                        ))}
                      </ThemedSelect>
                      <p className="mt-2 text-sm text-danger">
                        {form.formState.errors.attendingDoctorId?.message}
                      </p>
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-ink">Bed</span>
                      <ThemedSelect
                        {...form.register("bedId")}
                        className="mt-2"
                      >
                        <option value="">Select bed</option>
                        {availableBeds.map((bed) => (
                          <option key={bed.id} value={bed.id}>
                            {bed.bedNumber} - {bed.wardName}
                            {bed.roomNumber ? ` / ${bed.roomNumber}` : ""}
                          </option>
                        ))}
                      </ThemedSelect>
                      <p className="mt-2 text-sm text-danger">
                        {form.formState.errors.bedId?.message}
                      </p>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-ink">
                        Admitted at
                      </span>
                      <Input
                        {...form.register("admittedAt")}
                        className="mt-2"
                        type="datetime-local"
                      />
                      <p className="mt-2 text-sm text-danger">
                        {form.formState.errors.admittedAt?.message}
                      </p>
                    </label>
                  </div>

                  <Button
                    disabled={isMutating || patients.length === 0 ||
                      doctors.length === 0 || availableBeds.length === 0}
                    type="submit"
                  >
                    {assignMutation.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <ClipboardPlus className="h-4 w-4" />}
                    Assign bed and admit
                  </Button>
                </form>
              )
              : (
                <EmptyState
                  className="mt-6 min-h-56"
                  description="The occupancy board remains visible to viewers, but assigning, transferring, discharging, or updating bed states requires occupancy.manage."
                  icon={BedDouble}
                  title="Read-only occupancy access"
                />
              )}
          </SurfaceCard>
          <SurfaceCard>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  Selected bed
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                  Movement controls and context
                </h2>
              </div>

              {selectedBed
                ? (
                  <span
                    className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${
                      statusToneMap[selectedBed.status]
                    }`}
                  >
                    {selectedBed.status.replaceAll("_", " ")}
                  </span>
                )
                : null}
            </div>

            {!selectedBed
              ? (
                <EmptyState
                  className="mt-6 min-h-56"
                  description="Select any bed from the ward board to inspect the patient context, discharge flow, transfer destination, or manual housekeeping status."
                  icon={Sparkles}
                  title="No bed selected"
                />
              )
              : (
                <div className="mt-6 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="glass-panel-muted rounded-[24px] p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                        Bed identity
                      </p>
                      <h3 className="mt-3 text-xl font-semibold text-ink">
                        {selectedBed.bedNumber}
                      </h3>
                      <p className="mt-2 text-sm text-ink-soft">
                        {selectedBed.wardName}
                        {selectedBed.roomNumber
                          ? ` / ${selectedBed.roomNumber}`
                          : ""}
                      </p>
                      <p className="mt-2 text-sm text-ink-soft">
                        {selectedBed.roomType || "Room type pending"}
                      </p>
                    </div>

                    <div className="glass-panel-muted rounded-[24px] p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                        Patient context
                      </p>
                      <h3 className="mt-3 text-xl font-semibold text-ink">
                        {selectedBed.patientName || "No active admission"}
                      </h3>
                      <p className="mt-2 text-sm text-ink-soft">
                        {selectedBed.patientHospitalNumber || "UHID pending"}
                      </p>
                      <p className="mt-2 text-sm text-ink-soft">
                        {selectedBed.doctorName || "No attending doctor"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="metric-tile rounded-[22px] px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">
                        Daily charge
                      </p>
                      <p className="mt-2 text-lg font-semibold text-ink">
                        {formatCurrency(selectedBed.dailyCharge)}
                      </p>
                    </div>
                    <div className="metric-tile rounded-[22px] px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">
                        Admitted at
                      </p>
                      <p className="mt-2 text-sm font-medium text-ink">
                        {formatDateTime(selectedBed.admittedAt)}
                      </p>
                    </div>
                    <div className="metric-tile rounded-[22px] px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">
                        Floor
                      </p>
                      <p className="mt-2 text-sm font-medium text-ink">
                        {selectedBed.wardFloor || "Not mapped"}
                      </p>
                    </div>
                  </div>

                  {selectedBed.admissionId && canManage
                    ? (
                      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                        <div className="glass-panel-muted rounded-[24px] p-5">
                          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">
                            Transfer patient
                          </p>
                          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                            <ThemedSelect
                              className="glass-input w-full"
                              onChange={(event) =>
                                setTransferTargetBedId(event.target.value)}
                              value={transferTargetBedId}
                            >
                              <option value="">Select target bed</option>
                              {transferTargets.map((bed) => (
                                <option key={bed.id} value={bed.id}>
                                  {bed.bedNumber} - {bed.wardName}
                                  {bed.roomNumber ? ` / ${bed.roomNumber}` : ""}
                                </option>
                              ))}
                            </ThemedSelect>

                            <Button
                              disabled={transferMutation.isPending ||
                                transferTargets.length === 0 ||
                                !transferTargetBedId}
                              onClick={handleTransfer}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              {transferMutation.isPending
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Shuffle className="h-4 w-4" />}
                              Transfer
                            </Button>
                          </div>
                        </div>

                        <Button
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={dischargeMutation.isPending}
                          onClick={handleDischarge}
                          type="button"
                        >
                          {dischargeMutation.isPending
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <UserMinus className="h-4 w-4" />}
                          Discharge
                        </Button>
                      </div>
                    )
                    : null}

                  {!selectedBed.admissionId && canManage
                    ? (
                      <div className="glass-panel-muted rounded-[24px] p-5">
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">
                          Manual bed status
                        </p>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                          <ThemedSelect
                            className="glass-input w-full"
                            onChange={(event) => {
                              setManualStatus(
                                event.target.value as Exclude<
                                  BedStatus,
                                  "OCCUPIED"
                                >,
                              );
                              setManualStatusBedId(selectedBed.id);
                            }}
                            value={effectiveManualStatus}
                          >
                            {editableBedStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status.replaceAll("_", " ")}
                              </option>
                            ))}
                          </ThemedSelect>

                          <Button
                            disabled={updateStatusMutation.isPending ||
                              effectiveManualStatus === selectedBed.status}
                            onClick={handleManualStatusUpdate}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            {updateStatusMutation.isPending
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Wrench className="h-4 w-4" />}
                            Update status
                          </Button>
                        </div>
                      </div>
                    )
                    : null}
                </div>
              )}
          </SurfaceCard>
        </div>

        <SurfaceCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Live ward board
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                Search, filter, and inspect beds
              </h2>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="glass-panel-muted flex items-center gap-3 rounded-full px-4 py-3 text-sm text-ink-soft">
                <Search className="h-4 w-4 text-brand" />
                <Input
                  className="h-auto min-w-44 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search ward, room, patient, doctor"
                  value={search}
                />
              </label>

              <ThemedSelect
                className="glass-panel-muted rounded-full py-3 font-medium"
                onChange={(event) => setWardFilter(event.target.value)}
                value={wardFilter}
              >
                <option value="">All wards</option>
                {inventoryWards.map((ward) => (
                  <option key={ward.id} value={ward.id}>
                    {ward.name}
                  </option>
                ))}
              </ThemedSelect>

              <ThemedSelect
                className="glass-panel-muted rounded-full py-3 font-medium"
                onChange={(event) =>
                  setStatusFilter(event.target.value as BedStatus | "ALL")}
                value={statusFilter}
              >
                <option value="ALL">All statuses</option>
                {BED_STATUS.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </ThemedSelect>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            {occupancyQuery.isLoading
              ? (
                <div className="glass-panel-muted flex items-center gap-3 rounded-[24px] px-4 py-5 text-sm text-ink-soft">
                  <Loader2 className="h-4 w-4 animate-spin text-brand" />
                  Loading occupancy board
                </div>
              )
              : null}

            {!occupancyQuery.isLoading && wards.length === 0
              ? (
                <EmptyState
                  description="No beds match the current filters yet. Change the search or filters, or seed more beds into the ward inventory."
                  icon={BedDouble}
                  title="No bed records found"
                />
              )
              : null}

            {wards.map((ward) => (
              <article
                key={ward.id}
                className="glass-panel-muted rounded-[28px] p-5"
              >
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-2xl font-semibold text-ink">
                        {ward.name}
                      </h3>
                      <span className="glass-chip rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                        Floor {ward.floor || "NA"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-ink-soft">
                      {ward.occupiedBeds} occupied of {ward.totalBeds}{" "}
                      beds available
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <div className="metric-tile rounded-[22px] px-4 py-3 text-center">
                      <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">
                        Occupancy
                      </p>
                      <p className="mt-1 text-lg font-semibold text-ink">
                        {getOccupancyPercent(ward.occupiedBeds, ward.totalBeds)}
                      </p>
                    </div>
                    <div className="metric-tile rounded-[22px] px-4 py-3 text-center">
                      <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">
                        Free
                      </p>
                      <p className="mt-1 text-lg font-semibold text-ink">
                        {ward.availableBeds}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  {ward.rooms.map((room) => (
                    <div
                      key={room.id ?? `${ward.id}-${room.roomNumber ?? "room"}`}
                      className="glass-panel rounded-[24px] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-ink">
                            {room.roomNumber || "Room pending"}
                          </p>
                          <p className="mt-1 text-sm text-ink-soft">
                            {room.roomType || "Type pending"}
                          </p>
                        </div>
                        <div className="metric-tile rounded-[18px] px-3 py-2 text-right">
                          <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">
                            Daily charge
                          </p>
                          <p className="mt-1 text-sm font-semibold text-ink">
                            {formatCurrency(room.dailyCharge)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {room.beds.map((bed) => (
                          <Button
                            key={bed.id}
                            className={`h-auto rounded-[22px] border p-4 text-left transition ${
                              statusToneMap[bed.status]
                            } ${
                              selectedBedId === bed.id
                                ? "ring-2 ring-brand ring-offset-2"
                                : "hover:border-brand"
                            }`}
                            onClick={() => selectBed(bed)}
                            type="button"
                            variant="outline"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-base font-semibold">
                                  {bed.bedNumber}
                                </p>
                                <p className="mt-1 text-xs uppercase tracking-[0.16em]">
                                  {bed.status.replaceAll("_", " ")}
                                </p>
                              </div>
                              <BedDouble className="mt-1 h-4 w-4" />
                            </div>

                            <div className="mt-4 space-y-2 text-sm">
                              <p className="font-medium">
                                {bed.patientName || "No active patient"}
                              </p>
                              <p className="opacity-80">
                                {bed.patientHospitalNumber ||
                                  "No UHID assigned"}
                              </p>
                              <p className="opacity-80">
                                {bed.doctorName || "No doctor assigned"}
                              </p>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
