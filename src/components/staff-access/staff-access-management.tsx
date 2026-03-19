"use client";

import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Plus,
  Printer,
  RefreshCcw,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
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

import {
  PERMISSION_GROUPS,
  type PermissionKey,
  ROLE_PERMISSIONS,
} from "@/constants/permissions";
import { ROLE_LABELS } from "@/constants/roles";
import { STAFF_ACCESS_STATUS } from "@/constants/staffAccessDefaults";
import { BulkActionToolbar } from "@/components/tables/bulk-action-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/bottom-drawer";
import { Input } from "@/components/ui/input";
import { SurfaceCard } from "@/components/ui/surface-card";
import { ThemedSelect } from "@/components/ui/themed-select";
import { useConfirmationDialog } from "@/hooks/useConfirmationDialog";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import {
  useCreateStaffAccess,
  useDeleteStaffAccess,
  useStaffAccessDirectory,
  useUpdateStaffAccess,
} from "@/hooks/useStaffAccessApi";
import { apiClient } from "@/lib/api/client";
import {
  downloadCsv,
  downloadExcelHtml,
  downloadJson,
  openPrintTable,
  type ExportColumn,
} from "@/lib/export/client";
import { createStaffAccessSchema } from "@/lib/validators/staff-access";
import type { BulkActionResponse } from "@/types/bulk";
import type { StaffAccessRecord } from "@/types/staffAccess";

type StaffAccessFormValues = z.infer<typeof createStaffAccessSchema>;

const defaultFormValues: StaffAccessFormValues = {
  email: "",
  displayName: "",
  role: "RECEPTION_STAFF",
  status: "APPROVED",
  defaultPermissions: [...ROLE_PERMISSIONS.RECEPTION_STAFF],
};

const statusToneMap = {
  APPROVED: "border-transparent bg-success/15 text-success",
  PENDING: "border-transparent bg-warning/15 text-warning",
  REVOKED: "border-transparent bg-destructive/15 text-destructive",
} as const;

function formatDateTime(value: string | null) {
  return value ? format(new Date(value), "dd MMM yyyy, hh:mm a") : "Not yet";
}

function permissionLabel(permission: string) {
  return permission.split(".").join(" / ");
}

export function StaffAccessManagement() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") ?? "";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    (typeof STAFF_ACCESS_STATUS)[number] | "ALL"
  >("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<StaffAccessRecord | null>(
    null,
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const deferredSearch = useDebouncedSearch(search);

  const { canAccess: canManage } = useModuleAccess(["staffAccess.manage"]);
  const directoryQuery = useStaffAccessDirectory({
    q: deferredSearch,
    status: statusFilter,
  });
  const createMutation = useCreateStaffAccess();
  const updateMutation = useUpdateStaffAccess();
  const deleteMutation = useDeleteStaffAccess();
  const confirm = useConfirmationDialog();

  const form = useForm<StaffAccessFormValues>({
    resolver: zodResolver(createStaffAccessSchema),
    defaultValues: defaultFormValues,
  });

  const currentRole = useWatch({
    control: form.control,
    name: "role",
    defaultValue: defaultFormValues.role,
  });
  const currentPermissions = useWatch({
    control: form.control,
    name: "defaultPermissions",
    defaultValue: defaultFormValues.defaultPermissions,
  });
  const isSaving = createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;
  const entries = useMemo(
    () => directoryQuery.data?.entries ?? [],
    [directoryQuery.data?.entries],
  );
  const selectedEntries = entries.filter((entry) => selectedIds.includes(entry.id));
  const allVisibleSelected = entries.length > 0 &&
    entries.every((entry) => selectedIds.includes(entry.id));
  const staffAccessExportColumns: ExportColumn<StaffAccessRecord>[] = [
    {
      key: "displayName",
      label: "Display Name",
      value: (entry) => entry.displayName,
    },
    { key: "email", label: "Email", value: (entry) => entry.email },
    { key: "role", label: "Role", value: (entry) => ROLE_LABELS[entry.role] },
    { key: "status", label: "Status", value: (entry) => entry.status },
    {
      key: "userStatus",
      label: "Runtime User",
      value: (entry) => entry.userStatus ?? "None",
    },
    {
      key: "approvedAt",
      label: "Approved At",
      value: (entry) => formatDateTime(entry.approvedAt),
    },
    {
      key: "lastLoginAt",
      label: "Last Login",
      value: (entry) => formatDateTime(entry.lastLoginAt),
    },
    {
      key: "permissions",
      label: "Permissions",
      value: (entry) => entry.defaultPermissions.join(", "),
    },
  ];

  useEffect(() => {
    setSearch(queryParam);
  }, [queryParam]);

  useEffect(() => {
    if (!selectedEntry) {
      form.reset(defaultFormValues);
      return;
    }

    form.reset({
      email: selectedEntry.email,
      displayName: selectedEntry.displayName,
      role: selectedEntry.role,
      status: selectedEntry.status,
      defaultPermissions: selectedEntry.defaultPermissions,
    });
  }, [form, selectedEntry]);

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) => entries.some((entry) => entry.id === id))
    );
  }, [entries]);

  function resetToRolePreset() {
    form.setValue("defaultPermissions", [...ROLE_PERMISSIONS[currentRole]], {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function togglePermission(permission: PermissionKey) {
    const nextPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter((item) => item !== permission)
      : [...currentPermissions, permission];

    form.setValue("defaultPermissions", nextPermissions, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function beginEditing(entry: StaffAccessRecord) {
    startTransition(() => setSelectedEntry(entry));
    setIsDrawerOpen(true);
  }

  function clearSelection() {
    startTransition(() => setSelectedEntry(null));
    setIsDrawerOpen(false);
  }

  function clearBulkSelection() {
    setSelectedIds([]);
  }

  async function handleSubmit(values: StaffAccessFormValues) {
    if (selectedEntry) {
      updateMutation.mutate(
        {
          id: selectedEntry.id,
          displayName: values.displayName,
          role: values.role,
          status: values.status,
          defaultPermissions: values.defaultPermissions,
        },
        {
          onSuccess: () => {
            clearSelection();
          },
        },
      );

      return;
    }

    createMutation.mutate(values, {
      onSuccess: () => {
        form.reset(defaultFormValues);
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
        ? current.filter((id) => !entries.some((entry) => entry.id === id))
        : [...new Set([...current, ...entries.map((entry) => entry.id)])]
    );
  }

  function handleQuickStatus(
    entry: StaffAccessRecord,
    status: (typeof STAFF_ACCESS_STATUS)[number],
  ) {
    updateMutation.mutate({
      id: entry.id,
      status,
    });
  }

  async function handleDelete(entry: StaffAccessRecord) {
    const confirmed = await confirm({
      title: "Delete staff access?",
      description:
        `Delete staff access for ${entry.email}? Existing sessions will lose access on refresh.`,
      confirmLabel: "Delete access",
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

  async function invalidateDirectories() {
    await queryClient.invalidateQueries({ queryKey: ["staff-access"] });
    await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    await queryClient.invalidateQueries({ queryKey: ["reports"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] });
  }

  async function handleBulkStatusUpdate(
    status: (typeof STAFF_ACCESS_STATUS)[number],
  ) {
    if (selectedEntries.length === 0) {
      return;
    }

    setIsBulkUpdating(true);

    try {
      const result = (
        await apiClient.post<BulkActionResponse>("/api/staff-access/bulk", {
          action: "status",
          ids: selectedEntries.map((entry) => entry.id),
          status,
        })
      ).data;
      await invalidateDirectories();

      if (result.successCount > 0) {
        toast.success(`Updated ${result.successCount} access records.`);
      }

      if (result.failedCount > 0) {
        toast.error(`${result.failedCount} access records could not be updated.`);
      }

      clearBulkSelection();
    } finally {
      setIsBulkUpdating(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedEntries.length === 0) {
      return;
    }

    const confirmed = await confirm({
      title: "Delete selected staff access records?",
      description:
        `Delete ${selectedEntries.length} selected staff access records? Existing sessions will lose access on refresh.`,
      confirmLabel: "Delete selected",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    setIsBulkUpdating(true);

    try {
      const result = (
        await apiClient.post<BulkActionResponse>("/api/staff-access/bulk", {
          action: "delete",
          ids: selectedEntries.map((entry) => entry.id),
        })
      ).data;

      await invalidateDirectories();

      if (selectedEntry && result.successIds.includes(selectedEntry.id)) {
        clearSelection();
      }

      if (result.successCount > 0) {
        toast.success(`Deleted ${result.successCount} staff access records.`);
      }

      if (result.failedCount > 0) {
        toast.error(`${result.failedCount} staff access records could not be deleted.`);
      }

      clearBulkSelection();
    } finally {
      setIsBulkUpdating(false);
    }
  }

  function exportSelected(format: "csv" | "json" | "excel" | "print") {
    if (selectedEntries.length === 0) {
      return;
    }

    const filenameBase = `staff-access-export-${new Date().toISOString().slice(0, 10)}`;

    if (format === "csv") {
      downloadCsv(`${filenameBase}.csv`, selectedEntries, staffAccessExportColumns);
      return;
    }

    if (format === "json") {
      downloadJson(`${filenameBase}.json`, selectedEntries);
      return;
    }

    if (format === "excel") {
      downloadExcelHtml(
        `${filenameBase}.xls`,
        "Staff Access Export",
        selectedEntries,
        staffAccessExportColumns,
      );
      return;
    }

    openPrintTable("Staff Access Export", selectedEntries, staffAccessExportColumns);
  }

  const summary = directoryQuery.data?.summary;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-5">
        {[
          ["Access records", summary?.total ?? 0, "Approved staff identities"],
          ["Approved", summary?.approved ?? 0, "Can complete Google sign-in"],
          [
            "Pending",
            summary?.pending ?? 0,
            "Waiting for operational approval",
          ],
          ["Revoked", summary?.revoked ?? 0, "Blocked from dashboard access"],
          [
            "Active users",
            summary?.activeUsers ?? 0,
            "Synced user rows in runtime DB",
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

      <SurfaceCard className="space-y-5">
        <div className="management-toolbar-shell">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Invite-only access control
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              Manage approved Google identities before sign-in happens
            </h2>
          </div>

          <div className="management-toolbar-actions">
            <label className="management-search-shell">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                className="h-auto min-w-44 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search email, role, status"
                value={search}
              />
            </label>

            <ThemedSelect
              className="min-w-40"
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | (typeof STAFF_ACCESS_STATUS)[number]
                    | "ALL",
                )}
              value={statusFilter}
            >
              <option value="ALL">All statuses</option>
              {STAFF_ACCESS_STATUS.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </ThemedSelect>

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
          </div>
        </div>
      </SurfaceCard>

        <SurfaceCard>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Staff access control
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                Pre-approve staff identities
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Manage access profiles, roles, and module permissions for hospital staff.
              </p>
            </div>
          {canManage
            ? (
              <Button onClick={() => { clearSelection(); setIsDrawerOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Create access profile
              </Button>
            )
            : null}
        </div>
      </SurfaceCard>

      <Drawer
        open={isDrawerOpen}
        onOpenChange={(open) => {
          setIsDrawerOpen(open);
          if (!open) clearSelection();
        }}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {selectedEntry ? `Edit ${selectedEntry.displayName}` : "Create staff access"}
            </DrawerTitle>
            <DrawerDescription>
              {selectedEntry ? "Update roles and permissions for this identity." : "Pre-approve a Google identity for hospital dashboard sign-in."}
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 bg-background max-h-[70vh] overflow-y-auto">
            {canManage
              ? (
                <form
                  className="space-y-5"
                  onSubmit={form.handleSubmit(handleSubmit)}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-ink">
                        Staff email
                      </span>
                      <Input
                        {...form.register("email")}
                        className="mt-2"
                        disabled={Boolean(selectedEntry)}
                        placeholder="billing.kiosk@hospital.in"
                      />
                      <p className="mt-2 text-sm text-danger">
                        {form.formState.errors.email?.message}
                      </p>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-ink">
                        Display name
                      </span>
                      <Input
                        {...form.register("displayName")}
                        className="mt-2"
                        placeholder="Billing Kiosk"
                      />
                      <p className="mt-2 text-sm text-danger">
                        {form.formState.errors.displayName?.message}
                      </p>
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-ink">Role</span>
                      <ThemedSelect
                        {...form.register("role")}
                        className="mt-2"
                      >
                        {Object.entries(ROLE_LABELS).map(([role, label]) => (
                          <option key={role} value={role}>
                            {label}
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
                        {STAFF_ACCESS_STATUS.map((status) => (
                          <option key={status} value={status}>
                            {status.replaceAll("_", " ")}
                          </option>
                        ))}
                      </ThemedSelect>
                    </label>
                  </div>

                  <div className="management-subtle-card p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Module permissions
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          Role presets are a starting point. Use overrides only
                          where there is a real operational need.
                        </p>
                      </div>

                      <Button
                        onClick={resetToRolePreset}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Apply {ROLE_LABELS[currentRole]} preset
                      </Button>
                    </div>

                    <div className="mt-5 space-y-4">
                      {Object.entries(PERMISSION_GROUPS).map((
                        [groupKey, permissions],
                      ) => (
                        <section
                          key={groupKey}
                          className="rounded-xl border bg-card p-4 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground">
                              {groupKey}
                            </p>
                            <Badge variant="outline">
                              {permissions.filter((permission) =>
                                currentPermissions.includes(permission)
                              ).length}
                              /{permissions.length}
                            </Badge>
                          </div>

                          <div className="mt-4 grid gap-3 lg:grid-cols-2">
                            {permissions.map((permission) => {
                              const checked = currentPermissions.includes(
                                permission,
                              );

                              return (
                                <label
                                  key={permission}
                                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${
                                    checked
                                      ? "border-primary bg-primary/5"
                                      : "border-border bg-background"
                                  }`}
                                >
                                  <Checkbox
                                    checked={checked}
                                    onChange={() => togglePermission(permission)}
                                  />
                                  <span className="text-sm text-foreground">
                                    {permissionLabel(permission)}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </section>
                      ))}
                    </div>
                    <p className="mt-3 text-sm text-danger">
                      {form.formState.errors.defaultPermissions?.message}
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 pb-8">
                    <Button
                      disabled={isSaving}
                      type="submit"
                    >
                      {isSaving
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : selectedEntry
                        ? <UserRoundPen className="h-4 w-4 mr-2" />
                        : <Plus className="h-4 w-4 mr-2" />}
                      {selectedEntry
                        ? "Save access changes"
                        : "Create staff access"}
                    </Button>

                    <div className="management-selection-pill px-4 py-3 text-sm text-muted-foreground">
                      {currentPermissions.length} permissions selected
                    </div>
                  </div>
                </form>
              )
              : (
                <div className="management-subtle-card mt-6 mb-8 p-5 text-sm leading-7 text-muted-foreground">
                  You can review invite-only access records, but permission
                  changes require the{" "}
                  <span className="font-semibold text-foreground">
                    staffAccess.manage
                  </span>{" "}
                  capability.
                </div>
              )}
          </div>
        </DrawerContent>
      </Drawer>

      <section>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Directory
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                Approved, pending, and revoked access records
              </h3>
            </div>
            <div className="management-selection-pill px-4 py-3 text-sm text-muted-foreground">
              {entries.length} visible rows
            </div>
          </div>

          {canManage
            ? (
              <div className="mt-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="management-selection-pill px-4 py-3 text-sm text-muted-foreground">
                    Use bulk actions for approval, revocation, export, and cleanup.
                  </div>

                  <Button
                    onClick={toggleAllVisible}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {allVisibleSelected ? "Clear visible" : "Select all visible"}
                  </Button>
                </div>

                <BulkActionToolbar
                  count={selectedEntries.length}
                  itemLabel="access record"
                  onClear={clearBulkSelection}
                >
                  <Button
                    disabled={isBulkUpdating}
                    onClick={() => exportSelected("csv")}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Download className="h-4 w-4" />
                    CSV
                  </Button>
                  <Button
                    disabled={isBulkUpdating}
                    onClick={() => exportSelected("excel")}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Download className="h-4 w-4" />
                    Excel
                  </Button>
                  <Button
                    disabled={isBulkUpdating}
                    onClick={() => exportSelected("json")}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Download className="h-4 w-4" />
                    JSON
                  </Button>
                  <Button
                    disabled={isBulkUpdating}
                    onClick={() => exportSelected("print")}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                  <Button
                    disabled={isBulkUpdating}
                    onClick={() => void handleBulkStatusUpdate("APPROVED")}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Approve selected
                  </Button>
                  <Button
                    disabled={isBulkUpdating}
                    onClick={() => void handleBulkStatusUpdate("PENDING")}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Mark pending
                  </Button>
                  <Button
                    className="hover:border-warning hover:text-warning"
                    disabled={isBulkUpdating}
                    onClick={() => void handleBulkStatusUpdate("REVOKED")}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <ShieldOff className="h-4 w-4" />
                    Revoke selected
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
                </BulkActionToolbar>
              </div>
            )
            : null}

          {directoryQuery.isLoading
            ? (
              <div className="management-subtle-card mt-6 flex min-h-80 items-center justify-center border-dashed text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading staff access records
              </div>
            )
            : directoryQuery.error
            ? (
              <div className="alert-surface-danger mt-6 flex min-h-80 items-center justify-center rounded-xl border border-dashed px-6 text-center text-sm text-danger">
                <AlertCircle className="mr-2 h-4 w-4" />
                {directoryQuery.error.message}
              </div>
            )
            : entries.length
            ? (
              <div className="mt-6 space-y-4">
                {entries.map((entry) => (
                  <article
                    key={entry.id}
                    className={`rounded-xl border bg-card p-5 shadow-sm transition ${
                      selectedEntry?.id === entry.id
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          {canManage
                            ? (
                              <label className="management-selection-pill inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                <Checkbox
                                  checked={selectedIds.includes(entry.id)}
                                  onChange={() => toggleSelection(entry.id)}
                                />
                                Select
                              </label>
                            )
                            : null}
                          <h4 className="text-xl font-semibold text-foreground">
                            {entry.displayName}
                          </h4>
                          <Badge className={statusToneMap[entry.status]} variant="outline">
                            {entry.status}
                          </Badge>
                          <Badge variant="secondary">
                            {ROLE_LABELS[entry.role]}
                          </Badge>
                          {entry.userStatus === "ACTIVE"
                            ? (
                              <Badge variant="success">
                                Runtime user active
                              </Badge>
                            )
                            : (
                              <Badge variant="outline">
                                No active session user
                              </Badge>
                            )}
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="management-metric px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              Google identity
                            </p>
                            <p className="mt-2 text-sm font-medium text-foreground">
                              {entry.email}
                            </p>
                          </div>
                          <div className="management-metric px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              Last approval
                            </p>
                            <p className="mt-2 text-sm font-medium text-foreground">
                              {formatDateTime(entry.approvedAt)}
                            </p>
                          </div>
                          <div className="management-metric px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              Last login
                            </p>
                            <p className="mt-2 text-sm font-medium text-foreground">
                              {formatDateTime(entry.lastLoginAt)}
                            </p>
                          </div>
                          <div className="management-metric px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              Permission count
                            </p>
                            <p className="mt-2 text-sm font-medium text-foreground">
                              {entry.defaultPermissions.length} granted modules
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {entry.defaultPermissions.map((permission) => (
                            <Badge
                              key={permission}
                              variant="outline"
                            >
                              {permissionLabel(permission)}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 xl:w-56 xl:justify-end">
                        <Button
                          onClick={() => beginEditing(entry)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <UserRoundPen className="h-4 w-4" />
                          Edit
                        </Button>

                        {canManage
                          ? (
                            <>
                              <Button
                                className={entry.status === "APPROVED"
                                  ? "hover:border-warning hover:text-warning"
                                  : "hover:border-success hover:text-success"}
                                disabled={updateMutation.isPending}
                                onClick={() =>
                                  handleQuickStatus(
                                    entry,
                                    entry.status === "APPROVED"
                                      ? "REVOKED"
                                      : "APPROVED",
                                  )}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                {entry.status === "APPROVED"
                                  ? <ShieldOff className="h-4 w-4" />
                                  : <ShieldCheck className="h-4 w-4" />}
                                {entry.status === "APPROVED"
                                  ? "Revoke"
                                  : "Approve"}
                              </Button>

                              <Button
                                className="border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => handleDelete(entry)}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                <Trash2 className="h-4 w-4" />
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
            )
            : (
              <div className="management-subtle-card mt-6 flex min-h-80 flex-col items-center justify-center border-dashed px-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                <h4 className="mt-4 text-xl font-semibold text-foreground">
                  No staff access records matched
                </h4>
                <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">
                  Adjust the search or status filter, or create the first
                  approved staff profile so Google sign-in can be resolved
                  before access is granted.
                </p>
              </div>
            )}
        </section>
    </div>
  );
}
