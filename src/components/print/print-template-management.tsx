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
  GripVertical,
  LayoutTemplate,
  Loader2,
  RotateCcw,
  Search,
  Save,
  Settings2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import type { PrintTemplateKey } from "@/constants/printConfig";
import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import {
  usePrintTemplates,
  useResetPrintTemplate,
  useUpdatePrintTemplate,
} from "@/hooks/usePrintTemplates";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { cn } from "@/lib/utils/cn";
import type { PrintTemplateSectionRecord } from "@/types/printTemplates";

type TemplateFilter = "all" | "customized" | "default" | "dirty";

function sortSections(sections: PrintTemplateSectionRecord[]) {
  return [...sections].sort((left, right) =>
    left.displayOrder - right.displayOrder ||
    left.defaultOrder - right.defaultOrder
  );
}

function areSectionsEqual(
  left: PrintTemplateSectionRecord[],
  right: PrintTemplateSectionRecord[],
) {
  if (left.length !== right.length) {
    return false;
  }

  const leftSorted = sortSections(left);
  const rightSorted = sortSections(right);

  return leftSorted.every((section, index) => {
    const comparison = rightSorted[index];
    return section.key === comparison.key &&
      section.displayOrder === comparison.displayOrder;
  });
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Default order";
  }

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SortableTemplateSection({
  disabled,
  section,
}: {
  disabled: boolean;
  section: PrintTemplateSectionRecord;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.key,
    disabled,
  });

  return (
    <div
      className={cn(
        "management-subtle-card flex items-start justify-between gap-4 px-4 py-3 transition",
        isDragging ? "border-brand bg-surface shadow-[var(--shadow-soft)]" : "",
      )}
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Button
          aria-label={`Reorder ${section.label}`}
          className="mt-0.5"
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
          <p className="text-sm font-semibold text-foreground">{section.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
        </div>
      </div>

      <Badge variant="outline">
        #{section.displayOrder + 1}
      </Badge>
    </div>
  );
}

type PrintTemplateManagementProps = {
  hideHeader?: boolean;
};

export function PrintTemplateManagement({ hideHeader = false }: PrintTemplateManagementProps) {
  const templatesQuery = usePrintTemplates();
  const updateTemplateMutation = useUpdatePrintTemplate();
  const resetTemplateMutation = useResetPrintTemplate();
  const { canAccess: canManage } = useModuleAccess(["settings.manage"]);
  const [activeFilter, setActiveFilter] = useState<TemplateFilter>("all");
  const [searchValue, setSearchValue] = useState("");
  const [selectedKey, setSelectedKey] = useState<PrintTemplateKey>("a4Bill");
  const [editingTemplateKey, setEditingTemplateKey] = useState<
    PrintTemplateKey | null
  >(null);
  const [draftSections, setDraftSections] = useState<
    PrintTemplateSectionRecord[] | null
  >(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const selectedTemplate =
    templatesQuery.data?.templates.find((template) =>
      template.key === selectedKey
    ) ?? null;

  const orderedSections = useMemo(
    () =>
      sortSections(
        editingTemplateKey === selectedKey && draftSections
          ? draftSections
          : selectedTemplate?.sections ?? [],
      ),
    [draftSections, editingTemplateKey, selectedKey, selectedTemplate],
  );

  const isEditing = editingTemplateKey === selectedKey &&
    draftSections !== null;
  const isSaving = updateTemplateMutation.isPending ||
    resetTemplateMutation.isPending;
  const isDirty = isEditing && selectedTemplate
    ? !areSectionsEqual(orderedSections, selectedTemplate.sections)
    : false;
  const normalizedSearch = searchValue.trim().toLowerCase();
  const filteredTemplates = useMemo(() => (
    templatesQuery.data?.templates.filter((template) => {
      const searchTarget = `${template.label} ${template.description} ${template.paperLabel}`
        .toLowerCase();
      const matchesSearch = normalizedSearch.length === 0 ||
        searchTarget.includes(normalizedSearch);

      if (!matchesSearch) {
        return false;
      }

      switch (activeFilter) {
        case "customized":
          return template.customized;
        case "default":
          return !template.customized;
        case "dirty":
          return template.key === selectedKey && isDirty;
        default:
          return true;
      }
    }) ?? []
  ), [activeFilter, isDirty, normalizedSearch, selectedKey, templatesQuery.data?.templates]);
  const filterCounts: Record<TemplateFilter, number> = {
    all: templatesQuery.data?.templates.length ?? 0,
    customized: templatesQuery.data?.templates.filter((template) =>
      template.customized
    ).length ?? 0,
    default: templatesQuery.data?.templates.filter((template) =>
      !template.customized
    ).length ?? 0,
    dirty: isDirty ? 1 : 0,
  };
  const filterOptions: Array<{
    description: string;
    label: string;
    value: TemplateFilter;
  }> = [
    {
      value: "all",
      label: "All templates",
      description: "Full document registry",
    },
    {
      value: "customized",
      label: "Customized",
      description: "Saved override order",
    },
    {
      value: "default",
      label: "Default",
      description: "Unchanged system order",
    },
    {
      value: "dirty",
      label: "Draft only",
      description: "Current unsaved reorder work",
    },
  ];
  const selectedTemplateVisible = filteredTemplates.some((template) =>
    template.key === selectedKey
  );

  function beginEditing() {
    if (!selectedTemplate) {
      return;
    }

    setEditingTemplateKey(selectedTemplate.key);
    setDraftSections(
      selectedTemplate.sections.map((section) => ({ ...section })),
    );
  }

  function handleSelectTemplate(templateKey: PrintTemplateKey) {
    setSelectedKey(templateKey);
    setEditingTemplateKey(null);
    setDraftSections(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!draftSections || !event.over || event.active.id === event.over.id) {
      return;
    }

    const current = sortSections(draftSections);
    const oldIndex = current.findIndex((section) =>
      section.key === event.active.id
    );
    const newIndex = current.findIndex((section) =>
      section.key === event.over?.id
    );

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    setDraftSections(
      arrayMove(current, oldIndex, newIndex).map((section, index) => ({
        ...section,
        displayOrder: index,
      })),
    );
  }

  function handleSave() {
    if (!selectedTemplate || !draftSections) {
      return;
    }

    updateTemplateMutation.mutate(
      {
        templateKey: selectedTemplate.key,
        sections: sortSections(draftSections).map((section, index) => ({
          key: section.key,
          displayOrder: index,
        })),
      },
      {
        onSuccess: () => {
          setEditingTemplateKey(null);
          setDraftSections(null);
        },
      },
    );
  }

  function handleReset() {
    if (!selectedTemplate) {
      return;
    }

    resetTemplateMutation.mutate(
      { templateKey: selectedTemplate.key },
      {
        onSuccess: () => {
          setEditingTemplateKey(null);
          setDraftSections(null);
        },
      },
    );
  }

  if (templatesQuery.isLoading) {
    return (
      <EmptyState
        className="min-h-[36rem]"
        icon={Loader2}
        title="Loading print templates"
        description="Section ordering and print layout controls are being prepared."
      />
    );
  }

  if (templatesQuery.isError || !templatesQuery.data) {
    return (
      <EmptyState
        className="min-h-[36rem]"
        icon={AlertTriangle}
        title="Print templates are unavailable"
        description={templatesQuery.error instanceof Error
          ? templatesQuery.error.message
          : "The print template workspace could not be loaded."}
      />
    );
  }

  return (
    <div className="space-y-6">
      {hideHeader
        ? null
        : (
          <PageHeader
            eyebrow="Print template control"
            title="Print templates and section ordering"
            description="Administrators can reorder document sections for A4 invoices, thermal receipts, discharge summaries, and consent documents without editing code."
          />
        )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_repeat(2,minmax(0,0.6fr))]">
        <SurfaceCard className="xl:col-span-2">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Workspace controls
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                Find the right document format and isolate the current draft quickly
              </h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Narrow the print registry by saved override state, then keep reordering
                work separate from persisted layouts so billing and discharge printouts
                stay predictable.
              </p>
            </div>

            <div className="w-full max-w-md">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Search templates
              </label>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search by layout, purpose, or paper format"
                  type="search"
                  value={searchValue}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {filterOptions.map((option) => (
              <Button
                className="h-auto min-w-[10rem] justify-between rounded-[var(--radius-panel)] px-4 py-3 text-left"
                key={option.value}
                onClick={() => setActiveFilter(option.value)}
                size="sm"
                type="button"
                variant={activeFilter === option.value ? "secondary" : "outline"}
              >
                <span className="flex min-w-0 flex-col items-start">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                    {option.label}
                  </span>
                  <span className="text-[11px] font-medium normal-case text-muted-foreground">
                    {option.description}
                  </span>
                </span>
                <Badge variant={activeFilter === option.value ? "secondary" : "outline"}>
                  {filterCounts[option.value]}
                </Badge>
              </Button>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Matching templates</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {filteredTemplates.length}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Visible templates after applying search and state filters.
          </p>
        </SurfaceCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {[
          ["Templates", templatesQuery.data.summary.total],
          ["Customized", templatesQuery.data.summary.customized],
          ["Sections", templatesQuery.data.summary.sections],
        ].map(([label, value]) => (
          <SurfaceCard key={String(label)}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {value}
            </p>
          </SurfaceCard>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SurfaceCard>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Templates
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {filteredTemplates.length} of {templatesQuery.data.templates.length} templates visible
          </p>
          <div className="mt-5 space-y-3">
            {filteredTemplates.length === 0
              ? (
                <EmptyState
                  className="min-h-[18rem]"
                  icon={LayoutTemplate}
                  title="No print templates match this view"
                  description="Clear the search or change the workspace filter to load other layouts."
                />
              )
              : null}

            {filteredTemplates.map((template) => (
              <Button
                className={cn(
                  "h-auto w-full rounded-[var(--radius-panel)] px-4 py-4 text-left transition",
                  selectedKey === template.key
                    ? "border-brand bg-card shadow-[var(--shadow-soft)]"
                    : "border-border bg-muted/30 hover:border-brand",
                )}
                key={template.key}
                onClick={() => handleSelectTemplate(template.key)}
                type="button"
                variant="outline"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-foreground">
                      {template.label}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      {template.description}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {template.paperLabel}
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Badge>
                    {template.sections.length} sections
                  </Badge>
                  <Badge variant="outline">
                    {template.customized ? "Customized" : "Default"}
                  </Badge>
                  {template.key === selectedKey && isDirty
                    ? <Badge variant="secondary">Active draft</Badge>
                    : null}
                </div>
              </Button>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          {selectedTemplate
            ? (
              <>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-2xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge>
                        {selectedTemplate.paperLabel}
                      </Badge>
                      <Badge variant="outline">
                        {selectedTemplate.customized
                          ? "Saved override"
                          : "Default order"}
                      </Badge>
                    </div>
                    <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                      {selectedTemplate.label}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      {selectedTemplate.description}
                    </p>
                    <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Updated {formatTimestamp(selectedTemplate.updatedAt)}
                      {selectedTemplate.updatedByName
                        ? ` by ${selectedTemplate.updatedByName}`
                        : ""}
                    </p>
                    {!selectedTemplateVisible
                      ? (
                        <p className="mt-3 text-sm text-muted-foreground">
                          This template remains selected, but it is outside the current
                          list filter.
                        </p>
                      )
                      : null}
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
                            {updateTemplateMutation.isPending
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Save className="h-4 w-4" />}
                            Save order
                          </Button>
                          <Button
                            disabled={isSaving}
                            onClick={() => {
                              setEditingTemplateKey(null);
                              setDraftSections(null);
                            }}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <X className="h-4 w-4" />
                            Discard draft
                          </Button>
                          <Button
                            className="hover:border-destructive hover:text-destructive"
                            disabled={isSaving}
                            onClick={handleReset}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            {resetTemplateMutation.isPending
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <RotateCcw className="h-4 w-4" />}
                            Reset template
                          </Button>
                        </>
                      )
                      : (
                        <>
                          <Button
                            disabled={!canManage}
                            onClick={beginEditing}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <Settings2 className="h-4 w-4" />
                            Customize order
                          </Button>
                          <Button
                            className="hover:border-destructive hover:text-destructive"
                            disabled={!canManage ||
                              !selectedTemplate.customized}
                            onClick={handleReset}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Reset to default
                          </Button>
                        </>
                      )}
                    </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  <SurfaceCard className="border border-border/60 bg-muted/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Saved state
                    </p>
                    <p className="mt-3 text-lg font-semibold text-foreground">
                      {selectedTemplate.customized ? "Customized order" : "Default order"}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {selectedTemplate.customized
                        ? "This template uses a persisted override instead of the system baseline."
                        : "This template still follows the shipped section order."}
                    </p>
                  </SurfaceCard>
                  <SurfaceCard className="border border-border/60 bg-muted/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Sections
                    </p>
                    <p className="mt-3 text-lg font-semibold text-foreground">
                      {orderedSections.length}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Ordered blocks rendered by the current print route.
                    </p>
                  </SurfaceCard>
                  <SurfaceCard className="border border-border/60 bg-muted/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Operator state
                    </p>
                    <p className="mt-3 text-lg font-semibold text-foreground">
                      {isDirty ? "Draft not saved" : isEditing ? "Draft opened" : "Read only"}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {isDirty
                        ? "Reordered sections differ from the persisted template layout."
                        : isEditing
                        ? "The template is in edit mode but currently matches the saved order."
                        : "No local draft is open for this template."}
                    </p>
                  </SurfaceCard>
                </div>

                <div className="management-record-shell mt-6 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                        Section order
                      </p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        Drag sections to change the rendered print order. The
                        document routes use the last saved order.
                      </p>
                    </div>
                    <Badge variant="outline">
                      <LayoutTemplate className="h-3.5 w-3.5" />
                      {orderedSections.length} sections
                    </Badge>
                  </div>

                  <DndContext
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={handleDragEnd}
                    sensors={sensors}
                  >
                    <SortableContext
                      items={orderedSections.map((section) => section.key)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="mt-5 space-y-3">
                        {orderedSections.map((section) => (
                          <SortableTemplateSection
                            disabled={!isEditing || isSaving}
                            key={section.key}
                            section={section}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>

                <div className="mt-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                    Preview order
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {orderedSections.map((section) => (
                      <span
                        className="management-selection-pill px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-foreground"
                        key={section.key}
                      >
                        #{section.displayOrder + 1} {section.label}
                      </span>
                    ))}
                  </div>
                </div>

                {!canManage
                  ? (
                    <p className="mt-6 text-sm text-muted-foreground">
                      Your role can review print template order but cannot
                      change it.
                    </p>
                  )
                  : null}
              </>
            )
            : null}
        </SurfaceCard>
      </section>
    </div>
  );
}
