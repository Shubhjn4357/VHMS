"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  ArrowUpRight,
  Eye,
  EyeOff,
  GripVertical,
  LayoutDashboard,
  Loader2,
  RotateCcw,
  Save,
  Settings2,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { DASHBOARD_OVERVIEW_WIDGETS } from "@/constants/dashboardLayouts";
import {
  useDashboardLayout,
  useResetDashboardLayout,
  useSaveDashboardLayout,
} from "@/hooks/useDashboardLayouts";
import { useDashboardOverview } from "@/hooks/useAnalyticsApi";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { cn } from "@/lib/utils/cn";
import type {
  DashboardLayoutRecord,
  DashboardLayoutWidgetRecord,
} from "@/types/dashboardLayouts";

const OVERVIEW_LAYOUT_KEY = "dashboard.overview" as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildDefaultWidgets(): DashboardLayoutWidgetRecord[] {
  return DASHBOARD_OVERVIEW_WIDGETS.map((widget) => ({
    key: widget.key,
    label: widget.label,
    description: widget.description,
    displayOrder: widget.defaultOrder,
    defaultOrder: widget.defaultOrder,
    visible: true,
    gridSpan: widget.gridSpan,
  }));
}

function sortWidgets(widgets: DashboardLayoutWidgetRecord[]) {
  return [...widgets].sort((left, right) =>
    left.displayOrder - right.displayOrder ||
    left.defaultOrder - right.defaultOrder
  );
}

function areLayoutsEqual(
  left: DashboardLayoutWidgetRecord[],
  right: DashboardLayoutWidgetRecord[],
) {
  if (left.length !== right.length) {
    return false;
  }

  const leftSorted = sortWidgets(left);
  const rightSorted = sortWidgets(right);

  return leftSorted.every((widget, index) => {
    const comparison = rightSorted[index];

    return widget.key === comparison.key &&
      widget.visible === comparison.visible &&
      widget.displayOrder === comparison.displayOrder;
  });
}

function getWidgetSpan(widget: DashboardLayoutWidgetRecord) {
  if (widget.key === "summary") {
    return "xl:col-span-12";
  }

  if (widget.key === "communications") {
    return "xl:col-span-4";
  }

  if (widget.key === "audit") {
    return "xl:col-span-8";
  }

  return "xl:col-span-6";
}

function SortableLayoutWidget({
  disabled,
  widget,
  onToggleVisible,
}: {
  disabled: boolean;
  widget: DashboardLayoutWidgetRecord;
  onToggleVisible: (key: DashboardLayoutWidgetRecord["key"]) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: widget.key,
    disabled,
  });

  return (
    <div
      className={cn(
        "management-subtle-card flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition",
        widget.visible ? "text-foreground" : "text-muted-foreground opacity-70",
        isDragging ? "border-primary/24 shadow-(--shadow-button)" : "",
      )}
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Button
          aria-label={`Reorder ${widget.label}`}
          className="mt-0.5 text-muted-foreground hover:text-primary"
          disabled={disabled}
          size="icon"
          type="button"
          variant="outline"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-current">{widget.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{widget.description}</p>
        </div>
      </div>

      <Button
        className={widget.visible
          ? "border-primary/18 bg-background text-primary"
          : "text-muted-foreground"}
        onClick={() => onToggleVisible(widget.key)}
        size="sm"
        type="button"
        variant="outline"
      >
        {widget.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        {widget.visible ? "Visible" : "Hidden"}
      </Button>
    </div>
  );
}

function OverviewPanel({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="surface-section rounded-[28px] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {actions}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function renderOverviewWidget(
  widget: DashboardLayoutWidgetRecord,
  overview: NonNullable<ReturnType<typeof useDashboardOverview>["data"]>,
  onRefresh: () => void,
  isRefreshing: boolean,
) {
  const {
    summary,
    appointmentQueue,
    wardStatus,
    communicationQueue,
    activityFeed,
    doctorLoad,
  } = overview;

  if (widget.key === "summary") {
    const summaryCards = [
      {
        label: "Number of patients",
        top: `${summary.totalPatients}`,
        topLabel: "Registered",
        bottom: `${summary.activeDoctors}`,
        bottomLabel: "Doctors",
      },
      {
        label: "Daily visit",
        top: `${summary.appointmentsToday}`,
        topLabel: "Scheduled",
        bottom: `${summary.appointmentsCheckedIn}`,
        bottomLabel: "Checked in",
      },
      {
        label: "Room capacity",
        top: `${summary.availableBeds}`,
        topLabel: "Beds available",
        bottom: `${summary.occupiedBeds}`,
        bottomLabel: "Occupied",
      },
    ];

    return (
      <OverviewPanel
        actions={
          <span className="management-selection-pill px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Live sync
          </span>
        }
        description="Patient, appointment, and occupancy signals pulled from the real hospital runtime."
        title="Statistical summary"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {summaryCards.map((card) => (
            <div className="management-record-shell rounded-xl p-4" key={card.label}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">{card.label}</p>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/16 text-primary">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
              <div className="management-metric mt-4 space-y-3 rounded-lg p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">{card.topLabel}</span>
                  <span className="text-2xl font-semibold text-foreground">{card.top}</span>
                </div>
                <div className="h-px bg-border/70" />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">{card.bottomLabel}</span>
                  <span className="text-2xl font-semibold text-foreground">{card.bottom}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </OverviewPanel>
    );
  }

  if (widget.key === "queue") {
    return (
      <OverviewPanel
        actions={
          <Button onClick={onRefresh} size="sm" type="button" variant="outline">
            {isRefreshing
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <RotateCcw className="h-4 w-4" />}
            Refresh
          </Button>
        }
        description="Doctor availability and front-desk progress for today's appointment flow."
        title="Doctor schedule and queue"
      >
        <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-3">
            {doctorLoad.slice(0, 4).map((entry) => (
              <div
                className="management-subtle-card rounded-xl p-4"
                key={entry.doctorName}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{entry.doctorName}</p>
                    <p className="text-sm text-muted-foreground">{entry.specialty}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {entry.appointmentsToday} visits
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Checked in {entry.checkedIn}</span>
                  <span className="rounded-full bg-warning/15 px-3 py-1 font-medium text-warning">
                    {entry.nextSlot ?? "No slot"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {appointmentQueue.map((appointment) => (
              <div
                className="management-subtle-card rounded-xl p-4"
                key={appointment.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{appointment.patientName}</p>
                    <p className="text-sm text-muted-foreground">{appointment.doctorName}</p>
                  </div>
                  <span className="management-selection-pill px-3 py-2 text-sm text-foreground">
                    {appointment.time}
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{appointment.status}</p>
              </div>
            ))}
          </div>
        </div>
      </OverviewPanel>
    );
  }

  if (widget.key === "occupancy") {
    return (
      <OverviewPanel
        actions={
          <span className="management-selection-pill px-3 py-2 text-xs text-muted-foreground">
            {summary.totalBeds} mapped beds
          </span>
        }
        description="Ward-level capacity and movement pressure from the live occupancy board."
        title="Ward capacity"
      >
        <div className="space-y-3">
          {wardStatus.map((ward) => {
            const width = `${Math.round((ward.occupied / Math.max(ward.total, 1)) * 100)}%`;

            return (
              <div
                className="management-subtle-card rounded-xl p-4"
                key={ward.wardId}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{ward.wardName}</p>
                    <p className="text-sm text-muted-foreground">{ward.status}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {ward.occupied}/{ward.total}
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-border/45">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="management-selection-pill px-3 py-1">
                    Available {ward.available}
                  </span>
                  <span className="management-selection-pill px-3 py-1">
                    Reserved {ward.reserved}
                  </span>
                  <span className="management-selection-pill px-3 py-1">
                    Cleaning {ward.cleaning}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </OverviewPanel>
    );
  }

  if (widget.key === "communications") {
    return (
      <OverviewPanel
        actions={
          <span className="management-selection-pill px-3 py-2 text-xs text-muted-foreground">
            {summary.pendingApprovals} waiting
          </span>
        }
        description="Delivery queue and pending approval pressure across message channels."
        title="Care coordination"
      >
        <div className="alert-surface-danger rounded-[22px] p-4">
          <p className="font-medium text-foreground">Operational alerts</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {summary.unreadNotifications} unread notifications and {summary.pendingApprovals} approvals still need controlled review.
          </p>
        </div>
        <div className="mt-4 space-y-3">
          {communicationQueue.map((entry) => (
            <div
              className="management-subtle-card rounded-xl p-4"
              key={entry.channel}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">
                    {entry.channel.replaceAll("_", " ")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {entry.delivered} delivered, {entry.queued} queued, {entry.failed} failed
                  </p>
                </div>
                <span className="text-sm font-semibold text-foreground">{entry.total}</span>
              </div>
            </div>
          ))}
        </div>
      </OverviewPanel>
    );
  }

  return (
    <OverviewPanel
      actions={
        <span className="management-selection-pill px-3 py-2 text-xs text-muted-foreground">
          {activityFeed.length} recent events
        </span>
      }
      description="Permission, billing, discharge, and communication activity remains visible."
      title="Audit and approvals"
    >
      <div className="grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
        <div className="rounded-xl border border-primary/20 bg-primary/[0.06] p-5 text-foreground">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">
            Collections today
          </p>
          <p className="mt-3 text-4xl font-semibold">{formatCurrency(summary.collectionsToday)}</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The summary is using live bill totals instead of decorative placeholder revenue.
          </p>
        </div>
        <div className="space-y-3">
          {activityFeed.map((event, index) => (
            <div
              className="management-subtle-card rounded-xl p-4"
              key={event.id}
            >
              <div className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-background text-sm font-semibold text-foreground shadow-[var(--shadow-soft)]">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm leading-7 text-foreground">{event.summary}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {formatTimestamp(event.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </OverviewPanel>
  );
}

export function DashboardOverview() {
  const overviewQuery = useDashboardOverview();
  const layoutQuery = useDashboardLayout(OVERVIEW_LAYOUT_KEY);
  const saveLayoutMutation = useSaveDashboardLayout();
  const resetLayoutMutation = useResetDashboardLayout();
  const { canAccess: canConfigure } = useModuleAccess(["dashboard.configure"]);
  const [draftWidgets, setDraftWidgets] = useState<
    DashboardLayoutRecord["widgets"] | null
  >(null);

  const defaultWidgets = useMemo(() => buildDefaultWidgets(), []);
  const savedWidgets = layoutQuery.data?.widgets ?? defaultWidgets;
  const widgets = sortWidgets(draftWidgets ?? savedWidgets);
  const visibleWidgets = widgets.filter((widget) => widget.visible);
  const isEditing = draftWidgets !== null;
  const isDirty = isEditing && !areLayoutsEqual(draftWidgets, savedWidgets);
  const isSaving = saveLayoutMutation.isPending || resetLayoutMutation.isPending;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function startCustomizing() {
    setDraftWidgets(savedWidgets.map((widget) => ({ ...widget })));
  }

  function handleToggleVisible(key: DashboardLayoutWidgetRecord["key"]) {
    setDraftWidgets((current) => {
      if (!current) {
        return current;
      }

      const visibleCount = current.filter((widget) => widget.visible).length;

      return current.map((widget) => {
        if (widget.key !== key) {
          return widget;
        }

        if (widget.visible && visibleCount === 1) {
          toast.error("Keep at least one widget visible.");
          return widget;
        }

        return { ...widget, visible: !widget.visible };
      });
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!draftWidgets || !event.over || event.active.id === event.over.id) {
      return;
    }

    const current = sortWidgets(draftWidgets);
    const oldIndex = current.findIndex((widget) => widget.key === event.active.id);
    const newIndex = current.findIndex((widget) => widget.key === event.over?.id);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const reordered = arrayMove(current, oldIndex, newIndex).map((widget, index) => ({
      ...widget,
      displayOrder: index,
    }));

    setDraftWidgets(reordered);
  }

  function handleSave() {
    if (!draftWidgets) {
      return;
    }

    saveLayoutMutation.mutate(
      {
        layoutKey: OVERVIEW_LAYOUT_KEY,
        widgets: sortWidgets(draftWidgets).map((widget, index) => ({
          key: widget.key,
          displayOrder: index,
          visible: widget.visible,
        })),
      },
      {
        onSuccess: () => {
          setDraftWidgets(null);
        },
      },
    );
  }

  function handleReset() {
    resetLayoutMutation.mutate(
      { layoutKey: OVERVIEW_LAYOUT_KEY },
      {
        onSuccess: () => {
          setDraftWidgets(null);
        },
      },
    );
  }

  if (overviewQuery.isLoading) {
    return (
      <EmptyState
        className="min-h-[36rem]"
        description="The dashboard is assembling billing, occupancy, communication, and audit signals."
        icon={Loader2}
        title="Loading live operations overview"
      />
    );
  }

  if (overviewQuery.isError || !overviewQuery.data) {
    return (
      <EmptyState
        className="min-h-[36rem]"
        description={overviewQuery.error instanceof Error
          ? overviewQuery.error.message
          : "The overview request failed. Refresh once the API is reachable."}
        icon={AlertTriangle}
        title="Dashboard overview is unavailable"
      />
    );
  }

  return (
    <div className="space-y-5">
      <SurfaceCard className="rounded-[28px] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Dashboard layout</Badge>
              <Badge variant="outline">
                {layoutQuery.data?.summary.customized ? "Personalized" : "Default"}
              </Badge>
            </div>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              Compact hospital command surface
            </h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              The overview stays live, permission-aware, and personalizable without breaking the real operating data underneath it.
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {layoutQuery.data?.updatedAt
                ? `Saved ${formatTimestamp(layoutQuery.data.updatedAt)}`
                : "Using default layout order"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isEditing
              ? (
                <>
                  <Button
                    disabled={isSaving || !isDirty}
                    onClick={handleSave}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {saveLayoutMutation.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Save className="h-4 w-4" />}
                    Save
                  </Button>
                  <Button
                    disabled={isSaving}
                    onClick={() => setDraftWidgets(null)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </>
              )
              : (
                <Button
                  disabled={!canConfigure || layoutQuery.isLoading}
                  onClick={startCustomizing}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Settings2 className="h-4 w-4" />
                  Customize layout
                </Button>
              )}
            <Button
              disabled={!canConfigure || isSaving || !layoutQuery.data?.summary.customized}
              onClick={handleReset}
              size="sm"
              type="button"
              variant="outline"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
      </SurfaceCard>

      {canConfigure && isEditing
        ? (
          <SurfaceCard className="rounded-[28px] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                  Layout editor
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Drag widgets to reorder the command view and hide panels you do not need.
                </p>
              </div>
              <Badge variant="outline">
                <LayoutDashboard className="h-3.5 w-3.5" />
                {visibleWidgets.length}/{widgets.length} visible
              </Badge>
            </div>

            <DndContext
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleDragEnd}
              sensors={sensors}
            >
              <SortableContext
                items={widgets.map((widget) => widget.key)}
                strategy={verticalListSortingStrategy}
              >
                <div className="mt-5 space-y-3">
                  {widgets.map((widget) => (
                    <SortableLayoutWidget
                      disabled={isSaving}
                      key={widget.key}
                      onToggleVisible={handleToggleVisible}
                      widget={widget}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </SurfaceCard>
        )
        : null}

      <section className="overflow-hidden rounded-[var(--radius-panel)] border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5">
        <div className="flex flex-col gap-4 border-b border-border/70 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#f97373]" />
              <span className="h-3 w-3 rounded-full bg-[#fbbf24]" />
              <span className="h-3 w-3 rounded-full bg-[#34d399]" />
            </div>
            <div className="management-selection-pill px-4 py-2 text-xs font-medium text-muted-foreground">
              /dashboard
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="management-selection-pill px-3 py-2 text-xs text-muted-foreground">
              {formatCurrency(overviewQuery.data.summary.collectionsToday)} collected
            </span>
            <span className="management-selection-pill px-3 py-2 text-xs text-muted-foreground">
              {overviewQuery.data.summary.occupiedBeds}/{overviewQuery.data.summary.totalBeds} beds in use
            </span>
            <span className="management-selection-pill px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Live sync
            </span>
          </div>
        </div>

        {visibleWidgets.length === 0
          ? (
            <div className="py-10">
              <EmptyState
                description="Show at least one widget from the layout editor to bring the dashboard back."
                icon={LayoutDashboard}
                title="All widgets are hidden"
              />
            </div>
          )
          : (
            <div className="mt-5 grid gap-5 xl:grid-cols-12">
              {visibleWidgets.map((widget) => (
                <div className={cn(getWidgetSpan(widget))} key={widget.key}>
                  {renderOverviewWidget(
                    widget,
                    overviewQuery.data,
                    () => void overviewQuery.refetch(),
                    overviewQuery.isFetching,
                  )}
                </div>
              ))}
            </div>
          )}
      </section>
    </div>
  );
}
