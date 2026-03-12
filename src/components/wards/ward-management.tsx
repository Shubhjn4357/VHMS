"use client";

import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BedDouble,
  Download,
  DoorClosed,
  Edit3,
  Layers3,
  Loader2,
  MapPinned,
  Printer,
  RefreshCcw,
  Search,
  Shield,
  Trash2,
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

import { BED_STATUS, type BedStatus } from "@/constants/bedStatus";
import { BulkActionToolbar } from "@/components/tables/bulk-action-toolbar";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { ThemedSelect } from "@/components/ui/themed-select";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import {
  useCreateBed,
  useCreateRoom,
  useCreateWard,
  useDeleteBed,
  useDeleteRoom,
  useDeleteWard,
  useUpdateBed,
  useUpdateRoom,
  useUpdateWard,
  useWardManagementDirectory,
} from "@/hooks/useWardManagementApi";
import { apiClient } from "@/lib/api/client";
import {
  downloadCsv,
  downloadExcelHtml,
  downloadJson,
  openPrintTable,
  type ExportColumn,
} from "@/lib/export/client";
import {
  createBedSchema,
  createRoomSchema,
  createWardSchema,
} from "@/lib/validators/wards";
import type {
  BedUpsertInput,
  RoomUpsertInput,
  WardManagementBedRecord,
  WardManagementRoomRecord,
  WardManagementWardRecord,
  WardUpsertInput,
} from "@/types/wardManagement";
import type { BulkActionResponse } from "@/types/bulk";

type WardFormValues = z.infer<typeof createWardSchema>;
type RoomFormInput = z.input<typeof createRoomSchema>;
type RoomFormValues = z.output<typeof createRoomSchema>;
type BedFormValues = z.infer<typeof createBedSchema>;

const defaultWardValues: WardFormValues = {
  name: "",
  floor: "",
};

const defaultRoomValues: RoomFormInput = {
  wardId: "",
  roomNumber: "",
  roomType: "",
  dailyCharge: 0,
};

const defaultBedValues: BedFormValues = {
  wardId: "",
  roomId: "",
  bedNumber: "",
  status: "FREE",
};

const bedStatusToneMap: Record<BedStatus, string> = {
  FREE: "bg-[rgba(21,128,61,0.1)] text-success",
  OCCUPIED: "bg-[rgba(220,38,38,0.1)] text-danger",
  RESERVED: "bg-[rgba(21,94,239,0.1)] text-accent",
  CLEANING: "bg-[rgba(217,119,6,0.1)] text-warning",
  MAINTENANCE: "bg-[rgba(20,32,51,0.08)] text-ink",
  BLOCKED: "bg-[rgba(124,58,237,0.1)] text-[rgb(109,40,217)]",
};

const editableBedStatuses = BED_STATUS.filter((status) => status !== "OCCUPIED") as Exclude<
  BedStatus,
  "OCCUPIED"
>[];

function formatCurrency(value: number) {
  return `Rs ${value.toFixed(0)}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type WardManagementProps = {
  hideHeader?: boolean;
};

export function WardManagement({ hideHeader = false }: WardManagementProps) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") ?? "";
  const [search, setSearch] = useState("");
  const [wardFilter, setWardFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<BedStatus | "ALL">("ALL");
  const [selectedWardIds, setSelectedWardIds] = useState<string[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [selectedBedIds, setSelectedBedIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [selectedWard, setSelectedWard] = useState<WardManagementWardRecord | null>(
    null,
  );
  const [selectedRoom, setSelectedRoom] = useState<WardManagementRoomRecord | null>(
    null,
  );
  const [selectedBed, setSelectedBed] = useState<WardManagementBedRecord | null>(
    null,
  );
  const deferredSearch = useDebouncedSearch(search);

  const { canAccess: canManage } = useModuleAccess(["wards.manage"]);
  const directoryQuery = useWardManagementDirectory({
    q: deferredSearch,
    wardId: wardFilter || undefined,
    status: statusFilter,
  });
  const createWardMutation = useCreateWard();
  const deleteWardMutation = useDeleteWard();
  const updateWardMutation = useUpdateWard();
  const createRoomMutation = useCreateRoom();
  const deleteRoomMutation = useDeleteRoom();
  const updateRoomMutation = useUpdateRoom();
  const createBedMutation = useCreateBed();
  const deleteBedMutation = useDeleteBed();
  const updateBedMutation = useUpdateBed();

  const wardForm = useForm<WardFormValues>({
    resolver: zodResolver(createWardSchema),
    defaultValues: defaultWardValues,
  });
  const roomForm = useForm<RoomFormInput, unknown, RoomFormValues>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: defaultRoomValues,
  });
  const bedForm = useForm<BedFormValues>({
    resolver: zodResolver(createBedSchema),
    defaultValues: defaultBedValues,
  });

  const watchedBedWardId = useWatch({
    control: bedForm.control,
    name: "wardId",
    defaultValue: defaultBedValues.wardId,
  });

  useEffect(() => {
    setSearch(queryParam);
  }, [queryParam]);

  useEffect(() => {
    if (!selectedWard) {
      wardForm.reset(defaultWardValues);
      return;
    }

    wardForm.reset({
      name: selectedWard.name,
      floor: selectedWard.floor ?? "",
    });
  }, [selectedWard, wardForm]);

  useEffect(() => {
    if (!selectedRoom) {
      roomForm.reset(defaultRoomValues);
      return;
    }

    roomForm.reset({
      wardId: selectedRoom.wardId,
      roomNumber: selectedRoom.roomNumber,
      roomType: selectedRoom.roomType,
      dailyCharge: selectedRoom.dailyCharge,
    });
  }, [roomForm, selectedRoom]);

  useEffect(() => {
    if (!selectedBed) {
      bedForm.reset(defaultBedValues);
      return;
    }

    bedForm.reset({
      wardId: selectedBed.wardId,
      roomId: selectedBed.roomId ?? "",
      bedNumber: selectedBed.bedNumber,
      status: selectedBed.status === "OCCUPIED" ? "FREE" : selectedBed.status,
    });
  }, [bedForm, selectedBed]);

  const wards = useMemo(
    () => directoryQuery.data?.entries ?? [],
    [directoryQuery.data?.entries],
  );
  const directories = directoryQuery.data?.directories;
  const wardOptions = directories?.wards ?? [];
  const roomOptions = (directories?.rooms ?? []).filter((room) =>
    !watchedBedWardId || room.wardId === watchedBedWardId
  );
  const rooms = useMemo(
    () => wards.flatMap((ward) => ward.rooms),
    [wards],
  );
  const beds = useMemo(
    () => rooms.flatMap((room) => room.beds),
    [rooms],
  );
  const selectedWardEntries = wards.filter((entry) =>
    selectedWardIds.includes(entry.id)
  );
  const selectedRoomEntries = rooms.filter((entry) =>
    selectedRoomIds.includes(entry.id)
  );
  const selectedBedEntries = beds.filter((entry) =>
    selectedBedIds.includes(entry.id)
  );
  const allVisibleWardsSelected = wards.length > 0 &&
    wards.every((entry) => selectedWardIds.includes(entry.id));
  const allVisibleRoomsSelected = rooms.length > 0 &&
    rooms.every((entry) => selectedRoomIds.includes(entry.id));
  const allVisibleBedsSelected = beds.length > 0 &&
    beds.every((entry) => selectedBedIds.includes(entry.id));
  const wardExportColumns: ExportColumn<WardManagementWardRecord>[] = [
    { key: "name", label: "Ward", value: (entry) => entry.name },
    { key: "floor", label: "Floor", value: (entry) => entry.floor ?? "NA" },
    { key: "rooms", label: "Rooms", value: (entry) => entry.totalRooms },
    { key: "beds", label: "Beds", value: (entry) => entry.totalBeds },
    { key: "occupiedBeds", label: "Occupied Beds", value: (entry) => entry.occupiedBeds },
    { key: "availableBeds", label: "Available Beds", value: (entry) => entry.availableBeds },
    { key: "createdAt", label: "Created", value: (entry) => formatDate(entry.createdAt) },
  ];
  const roomExportColumns: ExportColumn<WardManagementRoomRecord>[] = [
    { key: "wardName", label: "Ward", value: (entry) => entry.wardName },
    { key: "roomNumber", label: "Room", value: (entry) => entry.roomNumber },
    { key: "roomType", label: "Type", value: (entry) => entry.roomType },
    { key: "dailyCharge", label: "Daily Charge", value: (entry) => formatCurrency(entry.dailyCharge) },
    { key: "totalBeds", label: "Beds", value: (entry) => entry.totalBeds },
    { key: "occupiedBeds", label: "Occupied Beds", value: (entry) => entry.occupiedBeds },
    { key: "availableBeds", label: "Available Beds", value: (entry) => entry.availableBeds },
  ];
  const bedExportColumns: ExportColumn<WardManagementBedRecord>[] = [
    { key: "wardName", label: "Ward", value: (entry) => entry.wardName },
    { key: "roomNumber", label: "Room", value: (entry) => entry.roomNumber ?? "Unassigned" },
    { key: "bedNumber", label: "Bed", value: (entry) => entry.bedNumber },
    { key: "status", label: "Status", value: (entry) => entry.status },
    { key: "patientName", label: "Patient", value: (entry) => entry.patientName ?? "No active patient" },
    { key: "hasActiveAdmission", label: "Active Admission", value: (entry) => (entry.hasActiveAdmission ? "Yes" : "No") },
    { key: "createdAt", label: "Created", value: (entry) => formatDate(entry.createdAt) },
  ];
  const summary = directoryQuery.data?.summary;
  const isSaving = createWardMutation.isPending || updateWardMutation.isPending ||
    createRoomMutation.isPending || updateRoomMutation.isPending ||
    createBedMutation.isPending || updateBedMutation.isPending;

  useEffect(() => {
    setSelectedWardIds((current) =>
      current.filter((id) => wards.some((entry) => entry.id === id))
    );
  }, [wards]);

  useEffect(() => {
    setSelectedRoomIds((current) =>
      current.filter((id) => rooms.some((entry) => entry.id === id))
    );
  }, [rooms]);

  useEffect(() => {
    setSelectedBedIds((current) =>
      current.filter((id) => beds.some((entry) => entry.id === id))
    );
  }, [beds]);

  function clearWardSelection() {
    startTransition(() => setSelectedWard(null));
    wardForm.reset(defaultWardValues);
  }

  function clearRoomSelection() {
    startTransition(() => setSelectedRoom(null));
    roomForm.reset(defaultRoomValues);
  }

  function clearBedSelection() {
    startTransition(() => setSelectedBed(null));
    bedForm.reset(defaultBedValues);
  }

  function editWard(entry: WardManagementWardRecord) {
    startTransition(() => {
      setSelectedWard(entry);
      setSelectedRoom(null);
      setSelectedBed(null);
    });
  }

  function editRoom(entry: WardManagementRoomRecord) {
    startTransition(() => {
      setSelectedWard(null);
      setSelectedRoom(entry);
      setSelectedBed(null);
    });
  }

  function editBed(entry: WardManagementBedRecord) {
    startTransition(() => {
      setSelectedWard(null);
      setSelectedRoom(null);
      setSelectedBed(entry);
    });
  }

  function handleWardSubmit(values: WardUpsertInput) {
    if (selectedWard) {
      updateWardMutation.mutate(
        {
          id: selectedWard.id,
          ...values,
        },
        {
          onSuccess: () => {
            clearWardSelection();
          },
        },
      );
      return;
    }

    createWardMutation.mutate(values, {
      onSuccess: () => {
        clearWardSelection();
      },
    });
  }

  function handleRoomSubmit(values: RoomUpsertInput) {
    if (selectedRoom) {
      updateRoomMutation.mutate(
        {
          id: selectedRoom.id,
          ...values,
        },
        {
          onSuccess: () => {
            clearRoomSelection();
          },
        },
      );
      return;
    }

    createRoomMutation.mutate(values, {
      onSuccess: () => {
        clearRoomSelection();
      },
    });
  }

  function handleBedSubmit(values: BedUpsertInput) {
    if (selectedBed) {
      updateBedMutation.mutate(
        selectedBed.hasActiveAdmission
          ? {
            id: selectedBed.id,
            bedNumber: values.bedNumber,
          }
          : {
            id: selectedBed.id,
            ...values,
          },
        {
          onSuccess: () => {
            clearBedSelection();
          },
        },
      );
      return;
    }

    createBedMutation.mutate(values, {
      onSuccess: () => {
        clearBedSelection();
      },
    });
  }

  function handleDeleteWard(entry: WardManagementWardRecord) {
    if (
      !window.confirm(
        `Delete ward ${entry.name}? Wards with rooms cannot be deleted.`,
      )
    ) {
      return;
    }

    deleteWardMutation.mutate(
      { id: entry.id },
      {
        onSuccess: () => {
          if (selectedWard?.id === entry.id) {
            clearWardSelection();
          }
        },
      },
    );
  }

  function handleDeleteRoom(entry: WardManagementRoomRecord) {
    if (
      !window.confirm(
        `Delete room ${entry.roomNumber}? Rooms with beds cannot be deleted.`,
      )
    ) {
      return;
    }

    deleteRoomMutation.mutate(
      { id: entry.id },
      {
        onSuccess: () => {
          if (selectedRoom?.id === entry.id) {
            clearRoomSelection();
          }
        },
      },
    );
  }

  function handleDeleteBed(entry: WardManagementBedRecord) {
    if (
      !window.confirm(
        `Delete bed ${entry.bedNumber}? Beds used in admission history cannot be deleted.`,
      )
    ) {
      return;
    }

    deleteBedMutation.mutate(
      { id: entry.id },
      {
        onSuccess: () => {
          if (selectedBed?.id === entry.id) {
            clearBedSelection();
          }
        },
      },
    );
  }

  function toggleWardSelection(id: string) {
    setSelectedWardIds((current) =>
      current.includes(id)
        ? current.filter((entryId) => entryId !== id)
        : [...current, id]
    );
  }

  function toggleRoomSelection(id: string) {
    setSelectedRoomIds((current) =>
      current.includes(id)
        ? current.filter((entryId) => entryId !== id)
        : [...current, id]
    );
  }

  function toggleBedSelection(id: string) {
    setSelectedBedIds((current) =>
      current.includes(id)
        ? current.filter((entryId) => entryId !== id)
        : [...current, id]
    );
  }

  function toggleAllVisibleWards() {
    setSelectedWardIds((current) =>
      allVisibleWardsSelected
        ? current.filter((id) => !wards.some((entry) => entry.id === id))
        : [...new Set([...current, ...wards.map((entry) => entry.id)])]
    );
  }

  function toggleAllVisibleRooms() {
    setSelectedRoomIds((current) =>
      allVisibleRoomsSelected
        ? current.filter((id) => !rooms.some((entry) => entry.id === id))
        : [...new Set([...current, ...rooms.map((entry) => entry.id)])]
    );
  }

  function toggleAllVisibleBeds() {
    setSelectedBedIds((current) =>
      allVisibleBedsSelected
        ? current.filter((id) => !beds.some((entry) => entry.id === id))
        : [...new Set([...current, ...beds.map((entry) => entry.id)])]
    );
  }

  function clearWardBulkSelection() {
    setSelectedWardIds([]);
  }

  function clearRoomBulkSelection() {
    setSelectedRoomIds([]);
  }

  function clearBedBulkSelection() {
    setSelectedBedIds([]);
  }

  async function invalidateWardDirectories() {
    await queryClient.invalidateQueries({ queryKey: ["ward-management"] });
    await queryClient.invalidateQueries({ queryKey: ["occupancy"] });
    await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    await queryClient.invalidateQueries({ queryKey: ["reports"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] });
  }

  function exportWardSelection(format: "csv" | "json" | "excel" | "print") {
    if (selectedWardEntries.length === 0) {
      return;
    }

    const filenameBase = `wards-export-${new Date().toISOString().slice(0, 10)}`;

    if (format === "csv") {
      downloadCsv(`${filenameBase}.csv`, selectedWardEntries, wardExportColumns);
      return;
    }

    if (format === "json") {
      downloadJson(`${filenameBase}.json`, selectedWardEntries);
      return;
    }

    if (format === "excel") {
      downloadExcelHtml(
        `${filenameBase}.xls`,
        "Ward Export",
        selectedWardEntries,
        wardExportColumns,
      );
      return;
    }

    openPrintTable("Ward Export", selectedWardEntries, wardExportColumns);
  }

  function exportRoomSelection(format: "csv" | "json" | "excel" | "print") {
    if (selectedRoomEntries.length === 0) {
      return;
    }

    const filenameBase = `rooms-export-${new Date().toISOString().slice(0, 10)}`;

    if (format === "csv") {
      downloadCsv(`${filenameBase}.csv`, selectedRoomEntries, roomExportColumns);
      return;
    }

    if (format === "json") {
      downloadJson(`${filenameBase}.json`, selectedRoomEntries);
      return;
    }

    if (format === "excel") {
      downloadExcelHtml(
        `${filenameBase}.xls`,
        "Room Export",
        selectedRoomEntries,
        roomExportColumns,
      );
      return;
    }

    openPrintTable("Room Export", selectedRoomEntries, roomExportColumns);
  }

  function exportBedSelection(format: "csv" | "json" | "excel" | "print") {
    if (selectedBedEntries.length === 0) {
      return;
    }

    const filenameBase = `beds-export-${new Date().toISOString().slice(0, 10)}`;

    if (format === "csv") {
      downloadCsv(`${filenameBase}.csv`, selectedBedEntries, bedExportColumns);
      return;
    }

    if (format === "json") {
      downloadJson(`${filenameBase}.json`, selectedBedEntries);
      return;
    }

    if (format === "excel") {
      downloadExcelHtml(
        `${filenameBase}.xls`,
        "Bed Export",
        selectedBedEntries,
        bedExportColumns,
      );
      return;
    }

    openPrintTable("Bed Export", selectedBedEntries, bedExportColumns);
  }

  async function handleBulkDeleteWards() {
    if (selectedWardEntries.length === 0) {
      return;
    }

    if (
      !window.confirm(
        `Delete ${selectedWardEntries.length} selected wards? Wards that still contain rooms will be skipped.`,
      )
    ) {
      return;
    }

    setIsBulkUpdating(true);

    try {
      const result = (
        await apiClient.post<BulkActionResponse>("/api/wards/bulk", {
          action: "delete",
          entity: "ward",
          ids: selectedWardEntries.map((entry) => entry.id),
        })
      ).data;

      await invalidateWardDirectories();

      if (selectedWard && result.successIds.includes(selectedWard.id)) {
        clearWardSelection();
      }

      if (result.successCount > 0) {
        toast.success(`Deleted ${result.successCount} wards.`);
      }

      if (result.failedCount > 0) {
        toast.error(`${result.failedCount} wards could not be deleted.`);
      }

      clearWardBulkSelection();
    } finally {
      setIsBulkUpdating(false);
    }
  }

  async function handleBulkDeleteRooms() {
    if (selectedRoomEntries.length === 0) {
      return;
    }

    if (
      !window.confirm(
        `Delete ${selectedRoomEntries.length} selected rooms? Rooms that still contain beds will be skipped.`,
      )
    ) {
      return;
    }

    setIsBulkUpdating(true);

    try {
      const result = (
        await apiClient.post<BulkActionResponse>("/api/wards/bulk", {
          action: "delete",
          entity: "room",
          ids: selectedRoomEntries.map((entry) => entry.id),
        })
      ).data;

      await invalidateWardDirectories();

      if (selectedRoom && result.successIds.includes(selectedRoom.id)) {
        clearRoomSelection();
      }

      if (result.successCount > 0) {
        toast.success(`Deleted ${result.successCount} rooms.`);
      }

      if (result.failedCount > 0) {
        toast.error(`${result.failedCount} rooms could not be deleted.`);
      }

      clearRoomBulkSelection();
    } finally {
      setIsBulkUpdating(false);
    }
  }

  async function handleBulkDeleteBeds() {
    if (selectedBedEntries.length === 0) {
      return;
    }

    if (
      !window.confirm(
        `Delete ${selectedBedEntries.length} selected beds? Beds used in admission history will be skipped.`,
      )
    ) {
      return;
    }

    setIsBulkUpdating(true);

    try {
      const result = (
        await apiClient.post<BulkActionResponse>("/api/wards/bulk", {
          action: "delete",
          entity: "bed",
          ids: selectedBedEntries.map((entry) => entry.id),
        })
      ).data;

      await invalidateWardDirectories();

      if (selectedBed && result.successIds.includes(selectedBed.id)) {
        clearBedSelection();
      }

      if (result.successCount > 0) {
        toast.success(`Deleted ${result.successCount} beds.`);
      }

      if (result.failedCount > 0) {
        toast.error(`${result.failedCount} beds could not be deleted.`);
      }

      clearBedBulkSelection();
    } finally {
      setIsBulkUpdating(false);
    }
  }

  async function handleBulkUpdateBedStatus(
    status: Exclude<BedStatus, "OCCUPIED">,
  ) {
    if (selectedBedEntries.length === 0) {
      return;
    }

    const updateableBeds = selectedBedEntries.filter((entry) =>
      !entry.hasActiveAdmission && entry.status !== status
    );
    const skippedCount = selectedBedEntries.length - updateableBeds.length;

    if (updateableBeds.length === 0) {
      toast.error("No selected beds can be moved to that state.");
      return;
    }

    setIsBulkUpdating(true);

    try {
      const result = (
        await apiClient.post<BulkActionResponse>("/api/wards/bulk", {
          action: "bedStatus",
          entity: "bed",
          ids: updateableBeds.map((entry) => entry.id),
          status,
        })
      ).data;

      await invalidateWardDirectories();

      if (result.successCount > 0) {
        toast.success(`Updated ${result.successCount} beds.`);
      }

      if (result.failedCount + skippedCount > 0) {
        toast.error(
          `${result.failedCount + skippedCount} beds were skipped or could not be updated.`,
        );
      }

      clearBedBulkSelection();
    } finally {
      setIsBulkUpdating(false);
    }
  }

  return (
    <div className="space-y-6">
      {hideHeader
        ? null
        : (
          <PageHeader
            eyebrow="Phase 3 master data"
            title="Ward, room, and bed management"
            description="Maintain the live accommodation map used by occupancy, admissions, billing, search, and reports. Master edits are separated from live bed movement so operational controls stay safe."
            actions={
              <>
                <Link
                  className={buttonVariants({ variant: "outline" })}
                  href="/dashboard/occupancy"
                >
                  Open occupancy board
                </Link>
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

      <section className="grid gap-4 xl:grid-cols-6">
        {[
          ["Wards", summary?.totalWards ?? 0, "Mapped care areas"],
          ["Rooms", summary?.totalRooms ?? 0, "Operational room inventory"],
          ["Beds", summary?.totalBeds ?? 0, "Managed bed records"],
          ["Occupied", summary?.occupiedBeds ?? 0, "Currently tied to admissions"],
          ["Free", summary?.availableBeds ?? 0, "Ready for allocation"],
          ["Blocked", summary?.blockedBeds ?? 0, "Unavailable until cleared"],
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

      <section className="grid gap-6 2xl:grid-cols-[0.94fr_1.06fr]">
        <div className="space-y-6">
          <SurfaceCard>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  Ward master
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                  {selectedWard ? `Edit ${selectedWard.name}` : "Add a ward"}
                </h2>
              </div>
              {selectedWard
                ? (
                  <Button
                    onClick={clearWardSelection}
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
                  onSubmit={wardForm.handleSubmit(handleWardSubmit)}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-ink">
                        Ward name
                      </span>
                      <Input
                        {...wardForm.register("name")}
                        className="mt-2"
                        placeholder="Ward C"
                      />
                      <p className="mt-2 text-sm text-danger">
                        {wardForm.formState.errors.name?.message}
                      </p>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-ink">Floor</span>
                      <Input
                        {...wardForm.register("floor")}
                        className="mt-2"
                        placeholder="5"
                      />
                      <p className="mt-2 text-sm text-danger">
                        {wardForm.formState.errors.floor?.message}
                      </p>
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button disabled={isSaving} type="submit">
                      {isSaving
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <MapPinned className="h-4 w-4" />}
                      {selectedWard ? "Save ward" : "Create ward"}
                    </Button>
                    <Button
                      onClick={clearWardSelection}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Reset
                    </Button>
                    {selectedWard
                      ? (
                        <Button
                          disabled={deleteWardMutation.isPending}
                          onClick={() => handleDeleteWard(selectedWard)}
                          size="sm"
                          type="button"
                          variant="destructive"
                        >
                          {deleteWardMutation.isPending
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />}
                          Delete ward
                        </Button>
                      )
                      : null}
                  </div>
                </form>
              )
              : (
                <EmptyState
                  className="mt-6 min-h-48"
                  description="Ward, room, and bed masters are visible to viewers, but editing them requires wards.manage."
                  icon={Shield}
                  title="Read-only master access"
                />
              )}
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  Room master
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                  {selectedRoom
                    ? `Edit room ${selectedRoom.roomNumber}`
                    : "Add a room"}
                </h2>
              </div>
              {selectedRoom
                ? (
                  <Button
                    onClick={clearRoomSelection}
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
                  onSubmit={roomForm.handleSubmit(handleRoomSubmit)}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="text-sm font-medium text-ink">Ward</span>
                      <ThemedSelect
                        {...roomForm.register("wardId")}
                        className="mt-2"
                      >
                        <option value="">Select ward</option>
                        {wardOptions.map((ward) => (
                          <option key={ward.id} value={ward.id}>
                            {ward.name}
                          </option>
                        ))}
                      </ThemedSelect>
                      <p className="mt-2 text-sm text-danger">
                        {roomForm.formState.errors.wardId?.message}
                      </p>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-ink">
                        Room number
                      </span>
                      <Input
                        {...roomForm.register("roomNumber")}
                        className="mt-2"
                        placeholder="C-501"
                      />
                      <p className="mt-2 text-sm text-danger">
                        {roomForm.formState.errors.roomNumber?.message}
                      </p>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-ink">
                        Room type
                      </span>
                      <Input
                        {...roomForm.register("roomType")}
                        className="mt-2"
                        placeholder="Single Deluxe"
                      />
                      <p className="mt-2 text-sm text-danger">
                        {roomForm.formState.errors.roomType?.message}
                      </p>
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-sm font-medium text-ink">
                      Daily charge
                    </span>
                    <Input
                      {...roomForm.register("dailyCharge")}
                      className="mt-2"
                      min="0"
                      step="0.01"
                      type="number"
                    />
                    <p className="mt-2 text-sm text-danger">
                      {roomForm.formState.errors.dailyCharge?.message}
                    </p>
                  </label>

                  <div className="flex flex-wrap gap-3">
                    <Button disabled={isSaving} type="submit">
                      {isSaving
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <DoorClosed className="h-4 w-4" />}
                      {selectedRoom ? "Save room" : "Create room"}
                    </Button>
                    <Button
                      onClick={clearRoomSelection}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Reset
                    </Button>
                    {selectedRoom
                      ? (
                        <Button
                          disabled={deleteRoomMutation.isPending}
                          onClick={() => handleDeleteRoom(selectedRoom)}
                          size="sm"
                          type="button"
                          variant="destructive"
                        >
                          {deleteRoomMutation.isPending
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />}
                          Delete room
                        </Button>
                      )
                      : null}
                  </div>
                </form>
              )
              : null}
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  Bed master
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                  {selectedBed
                    ? `Edit bed ${selectedBed.bedNumber}`
                    : "Add a bed"}
                </h2>
              </div>
              {selectedBed
                ? (
                  <Button
                    onClick={clearBedSelection}
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
                  onSubmit={bedForm.handleSubmit(handleBedSubmit)}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-ink">Ward</span>
                      <ThemedSelect
                        {...bedForm.register("wardId")}
                        className="mt-2"
                        disabled={selectedBed?.hasActiveAdmission}
                      >
                        <option value="">Select ward</option>
                        {wardOptions.map((ward) => (
                          <option key={ward.id} value={ward.id}>
                            {ward.name}
                          </option>
                        ))}
                      </ThemedSelect>
                      <p className="mt-2 text-sm text-danger">
                        {bedForm.formState.errors.wardId?.message}
                      </p>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-ink">Room</span>
                      <ThemedSelect
                        {...bedForm.register("roomId")}
                        className="mt-2"
                        disabled={selectedBed?.hasActiveAdmission}
                      >
                        <option value="">Select room</option>
                        {roomOptions.map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.roomNumber}
                          </option>
                        ))}
                      </ThemedSelect>
                      <p className="mt-2 text-sm text-danger">
                        {bedForm.formState.errors.roomId?.message}
                      </p>
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-ink">
                        Bed number
                      </span>
                      <Input
                        {...bedForm.register("bedNumber")}
                        className="mt-2"
                        placeholder="C-501-A"
                      />
                      <p className="mt-2 text-sm text-danger">
                        {bedForm.formState.errors.bedNumber?.message}
                      </p>
                    </label>

                    {selectedBed?.hasActiveAdmission
                      ? (
                        <div className="glass-panel-muted rounded-[22px] px-4 py-4">
                          <p className="text-sm font-medium text-ink">
                            Live status
                          </p>
                          <p className="mt-2 text-sm text-ink-soft">
                            {selectedBed.status.replaceAll("_", " ")}
                          </p>
                        </div>
                      )
                      : (
                        <label className="block">
                          <span className="text-sm font-medium text-ink">
                            Initial status
                          </span>
                          <ThemedSelect
                            {...bedForm.register("status")}
                            className="mt-2"
                          >
                            {editableBedStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status.replaceAll("_", " ")}
                              </option>
                            ))}
                          </ThemedSelect>
                          <p className="mt-2 text-sm text-danger">
                            {bedForm.formState.errors.status?.message}
                          </p>
                        </label>
                      )}
                  </div>

                  {selectedBed?.hasActiveAdmission
                    ? (
                      <p className="text-sm leading-6 text-warning">
                        This bed currently has an active admission. The master
                        allows renaming only; occupancy actions must still run
                        through the live board.
                      </p>
                    )
                    : null}

                  <div className="flex flex-wrap gap-3">
                    <Button disabled={isSaving} type="submit">
                      {isSaving
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <BedDouble className="h-4 w-4" />}
                      {selectedBed ? "Save bed" : "Create bed"}
                    </Button>
                    <Button
                      onClick={clearBedSelection}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Reset
                    </Button>
                    {selectedBed
                      ? (
                        <Button
                          disabled={deleteBedMutation.isPending}
                          onClick={() => handleDeleteBed(selectedBed)}
                          size="sm"
                          type="button"
                          variant="destructive"
                        >
                          {deleteBedMutation.isPending
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />}
                          Delete bed
                        </Button>
                      )
                      : null}
                  </div>
                </form>
              )
              : null}
          </SurfaceCard>
        </div>

        <SurfaceCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Accommodation map
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                Search wards, rooms, and beds
              </h2>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="glass-panel-muted flex items-center gap-3 rounded-[24px] px-4 py-3 text-sm text-ink-soft">
                <Search className="h-4 w-4 text-brand" />
                <Input
                  className="h-auto min-w-44 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search ward, room, bed, patient"
                  value={search}
                />
              </label>

              <ThemedSelect
                className="glass-panel-muted rounded-full py-3 font-medium"
                onChange={(event) => setWardFilter(event.target.value)}
                value={wardFilter}
              >
                <option value="">All wards</option>
                {wardOptions.map((ward) => (
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
                <option value="ALL">All bed states</option>
                {BED_STATUS.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </ThemedSelect>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {canManage
              ? (
                <div className="space-y-4">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <Button
                      onClick={toggleAllVisibleWards}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {allVisibleWardsSelected
                        ? "Clear visible wards"
                        : "Select all visible wards"}
                    </Button>
                    <Button
                      onClick={toggleAllVisibleRooms}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {allVisibleRoomsSelected
                        ? "Clear visible rooms"
                        : "Select all visible rooms"}
                    </Button>
                    <Button
                      onClick={toggleAllVisibleBeds}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {allVisibleBedsSelected
                        ? "Clear visible beds"
                        : "Select all visible beds"}
                    </Button>
                  </div>

                  <BulkActionToolbar
                    count={selectedWardEntries.length}
                    itemLabel="ward"
                    onClear={clearWardBulkSelection}
                  >
                    <Button
                      disabled={isBulkUpdating}
                      onClick={() => exportWardSelection("csv")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Download className="h-4 w-4" />
                      CSV
                    </Button>
                    <Button
                      disabled={isBulkUpdating}
                      onClick={() => exportWardSelection("excel")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Download className="h-4 w-4" />
                      Excel
                    </Button>
                    <Button
                      disabled={isBulkUpdating}
                      onClick={() => exportWardSelection("json")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Download className="h-4 w-4" />
                      JSON
                    </Button>
                    <Button
                      disabled={isBulkUpdating}
                      onClick={() => exportWardSelection("print")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </Button>
                    <Button
                      disabled={isBulkUpdating}
                      onClick={() => void handleBulkDeleteWards()}
                      size="sm"
                      type="button"
                      variant="destructive"
                    >
                      {isBulkUpdating
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />}
                      Delete selected
                    </Button>
                  </BulkActionToolbar>

                  <BulkActionToolbar
                    count={selectedRoomEntries.length}
                    itemLabel="room"
                    onClear={clearRoomBulkSelection}
                  >
                    <Button
                      disabled={isBulkUpdating}
                      onClick={() => exportRoomSelection("csv")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Download className="h-4 w-4" />
                      CSV
                    </Button>
                    <Button
                      disabled={isBulkUpdating}
                      onClick={() => exportRoomSelection("excel")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Download className="h-4 w-4" />
                      Excel
                    </Button>
                    <Button
                      disabled={isBulkUpdating}
                      onClick={() => exportRoomSelection("json")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Download className="h-4 w-4" />
                      JSON
                    </Button>
                    <Button
                      disabled={isBulkUpdating}
                      onClick={() => exportRoomSelection("print")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </Button>
                    <Button
                      disabled={isBulkUpdating}
                      onClick={() => void handleBulkDeleteRooms()}
                      size="sm"
                      type="button"
                      variant="destructive"
                    >
                      {isBulkUpdating
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />}
                      Delete selected
                    </Button>
                  </BulkActionToolbar>

                  <BulkActionToolbar
                    count={selectedBedEntries.length}
                    itemLabel="bed"
                    onClear={clearBedBulkSelection}
                  >
                    <Button
                      disabled={isBulkUpdating}
                      onClick={() => exportBedSelection("csv")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Download className="h-4 w-4" />
                      CSV
                    </Button>
                    <Button
                      disabled={isBulkUpdating}
                      onClick={() => exportBedSelection("excel")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Download className="h-4 w-4" />
                      Excel
                    </Button>
                    <Button
                      disabled={isBulkUpdating}
                      onClick={() => exportBedSelection("json")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Download className="h-4 w-4" />
                      JSON
                    </Button>
                    <Button
                      disabled={isBulkUpdating}
                      onClick={() => exportBedSelection("print")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </Button>
                    <Button
                      disabled={isBulkUpdating}
                      onClick={() => void handleBulkUpdateBedStatus("FREE")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Mark free
                    </Button>
                    <Button
                      disabled={isBulkUpdating}
                      onClick={() => void handleBulkUpdateBedStatus("RESERVED")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Reserve
                    </Button>
                    <Button
                      disabled={isBulkUpdating}
                      onClick={() => void handleBulkUpdateBedStatus("CLEANING")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Cleaning
                    </Button>
                    <Button
                      disabled={isBulkUpdating}
                      onClick={() => void handleBulkUpdateBedStatus("MAINTENANCE")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Maintenance
                    </Button>
                    <Button
                      disabled={isBulkUpdating}
                      onClick={() => void handleBulkUpdateBedStatus("BLOCKED")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Block
                    </Button>
                    <Button
                      disabled={isBulkUpdating}
                      onClick={() => void handleBulkDeleteBeds()}
                      size="sm"
                      type="button"
                      variant="destructive"
                    >
                      {isBulkUpdating
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />}
                      Delete selected
                    </Button>
                  </BulkActionToolbar>
                </div>
              )
              : null}

            {directoryQuery.isLoading
              ? (
                <div className="glass-panel-muted flex items-center gap-3 rounded-[24px] px-4 py-5 text-sm text-ink-soft">
                  <Loader2 className="h-4 w-4 animate-spin text-brand" />
                  Loading ward map
                </div>
              )
              : null}

            {!directoryQuery.isLoading && wards.length === 0
              ? (
                <EmptyState
                  description="No ward, room, or bed records match the current filters."
                  icon={Layers3}
                  title="No master records found"
                />
              )
              : null}

            {wards.map((ward) => (
              <article
                key={ward.id}
                className="glass-panel-muted rounded-[28px] p-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      {canManage
                        ? (
                          <label className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft dark:bg-white/8">
                            <Checkbox
                              checked={selectedWardIds.includes(ward.id)}
                              onChange={() => toggleWardSelection(ward.id)}
                            />
                            Select
                          </label>
                        )
                        : null}
                      <h3 className="text-2xl font-semibold text-ink">
                        {ward.name}
                      </h3>
                      <span className="glass-chip rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                        Floor {ward.floor || "NA"}
                      </span>
                      <span className="glass-chip rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                        Created {formatDate(ward.createdAt)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-ink-soft">
                      {ward.totalRooms} rooms / {ward.totalBeds} beds /{" "}
                      {ward.occupiedBeds} occupied
                    </p>
                  </div>

                  {canManage
                    ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => editWard(ward)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Edit3 className="h-4 w-4" />
                          Edit ward
                        </Button>
                        <Button
                          disabled={deleteWardMutation.isPending}
                          onClick={() => handleDeleteWard(ward)}
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

                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  {ward.rooms.map((room) => (
                    <div
                      key={room.id}
                      className="glass-panel rounded-[24px] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            {canManage
                              ? (
                                <label className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft dark:bg-white/8">
                                  <Checkbox
                                    checked={selectedRoomIds.includes(room.id)}
                                    onChange={() => toggleRoomSelection(room.id)}
                                  />
                                  Select
                                </label>
                              )
                              : null}
                            <p className="text-lg font-semibold text-ink">
                              {room.roomNumber}
                            </p>
                          </div>
                          <p className="mt-1 text-sm text-ink-soft">
                            {room.roomType}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="metric-tile rounded-[18px] px-3 py-2 text-right">
                            <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">
                              Charge
                            </p>
                            <p className="mt-1 text-sm font-semibold text-ink">
                              {formatCurrency(room.dailyCharge)}
                            </p>
                          </div>
                          {canManage
                            ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={() => editRoom(room)}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  <Edit3 className="h-4 w-4" />
                                  Edit
                                </Button>
                                <Button
                                  disabled={deleteRoomMutation.isPending}
                                  onClick={() => handleDeleteRoom(room)}
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
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {room.beds.length === 0
                          ? (
                            <div className="glass-panel-muted rounded-[20px] px-4 py-4 text-sm text-ink-soft sm:col-span-2">
                              No beds mapped yet.
                            </div>
                          )
                          : room.beds.map((bed) => (
                            <div
                              className="glass-panel-muted space-y-3 rounded-[20px] p-4"
                              key={bed.id}
                            >
                              {canManage
                                ? (
                                  <label className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft dark:bg-white/8">
                                    <Checkbox
                                      checked={selectedBedIds.includes(bed.id)}
                                      onChange={() => toggleBedSelection(bed.id)}
                                    />
                                    Select
                                  </label>
                                )
                                : null}
                              <Button
                                className="h-auto w-full flex-col items-start justify-start gap-3 rounded-[16px] p-0 text-left whitespace-normal hover:border-brand"
                                onClick={() => editBed(bed)}
                                type="button"
                                variant="ghost"
                              >
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-base font-semibold text-ink">
                                  {bed.bedNumber}
                                </p>
                                <span
                                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                                    bedStatusToneMap[bed.status]
                                  }`}
                                >
                                  {bed.status.replaceAll("_", " ")}
                                </span>
                              </div>
                              <p className="text-sm text-ink-soft">
                                {bed.patientName || "No active patient"}
                              </p>
                              </Button>
                              {canManage
                                ? (
                                  <Button
                                    className="w-full"
                                    disabled={deleteBedMutation.isPending}
                                    onClick={() => handleDeleteBed(bed)}
                                    size="sm"
                                    type="button"
                                    variant="destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete bed
                                  </Button>
                                )
                                : null}
                            </div>
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
