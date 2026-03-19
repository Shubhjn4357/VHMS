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
  Save,
  Settings2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import type { PrintTemplateKey } from "@/constants/printConfig";
import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
          <div className="mt-5 space-y-3">
            {templatesQuery.data.templates.map((template) => (
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
                            Cancel
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
