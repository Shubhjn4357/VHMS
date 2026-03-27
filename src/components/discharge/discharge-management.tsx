"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ClipboardPen,
  FileCheck2,
  Loader2,
  Printer,
  RefreshCcw,
  Search,
} from "lucide-react";
import { startTransition, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { DISCHARGE_SUMMARY_STATUS } from "@/constants/dischargeSummaryStatus";
import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormDrawer, FormDrawerSection } from "@/components/ui/form-drawer";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Textarea } from "@/components/ui/textarea";
import { ThemedSelect } from "@/components/ui/themed-select";
import {
  useCreateDischargeSummary,
  useDischargeWorkspace,
  useFinalizeDischargeSummary,
  useUpdateDischargeSummary,
} from "@/hooks/useDischargeApi";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { createDischargeSummarySchema } from "@/lib/validators/discharge";

type DischargeFormValues = z.infer<typeof createDischargeSummarySchema>;

const defaultValues: DischargeFormValues = {
  admissionId: "",
  diagnosis: "",
  hospitalCourse: "",
  procedures: "",
  dischargeMedication: "",
  dischargeAdvice: "",
  followUpInstructions: "",
};
const dischargeFormId = "discharge-summary-form";

const statusToneMap = {
  DRAFT: "border-transparent bg-secondary text-secondary-foreground",
  FINALIZED: "border-transparent bg-success/15 text-success",
} as const;

type DischargeManagementProps = {
  hideHeader?: boolean;
};

export function DischargeManagement({ hideHeader = false }: DischargeManagementProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    (typeof DISCHARGE_SUMMARY_STATUS)[number] | "ALL"
  >("ALL");
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(
    null,
  );
  const [selectedAdmissionId, setSelectedAdmissionId] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { canAccess: canManage } = useModuleAccess(["discharge.create"]);
  const dischargeQuery = useDischargeWorkspace({
    q: search,
    status: statusFilter,
  });
  const createMutation = useCreateDischargeSummary();
  const updateMutation = useUpdateDischargeSummary();
  const finalizeMutation = useFinalizeDischargeSummary();

  const form = useForm<DischargeFormValues>({
    resolver: zodResolver(createDischargeSummarySchema),
    defaultValues,
  });

  const entries = dischargeQuery.data?.entries ?? [];
  const admissions = dischargeQuery.data?.admissions ?? [];
  const summary = dischargeQuery.data?.summary;
  const selectedSummary =
    entries.find((entry) => entry.id === selectedSummaryId) ??
      null;
  const isFinalizedSelection = selectedSummary?.status === "FINALIZED";
  const usedAdmissionIds = new Set(entries.map((entry) => entry.admissionId));
  const availableAdmissions = admissions.filter((admission) =>
    !usedAdmissionIds.has(admission.id) || admission.id === selectedAdmissionId
  );

  useEffect(() => {
    if (selectedSummary) {
      form.reset({
        admissionId: selectedSummary.admissionId,
        diagnosis: selectedSummary.diagnosis,
        hospitalCourse: selectedSummary.hospitalCourse,
        procedures: selectedSummary.procedures ?? "",
        dischargeMedication: selectedSummary.dischargeMedication ?? "",
        dischargeAdvice: selectedSummary.dischargeAdvice,
        followUpInstructions: selectedSummary.followUpInstructions,
      });
      return;
    }

    form.reset({
      ...defaultValues,
      admissionId: selectedAdmissionId,
    });
  }, [form, selectedAdmissionId, selectedSummary]);

  function handleSubmit(values: DischargeFormValues) {
    if (selectedSummary) {
      updateMutation.mutate({
        id: selectedSummary.id,
        diagnosis: values.diagnosis,
        hospitalCourse: values.hospitalCourse,
        procedures: values.procedures,
        dischargeMedication: values.dischargeMedication,
        dischargeAdvice: values.dischargeAdvice,
        followUpInstructions: values.followUpInstructions,
      });

      return;
    }

    createMutation.mutate(values, {
      onSuccess: (createdSummary) => {
        setSelectedAdmissionId(values.admissionId);
        startTransition(() => setSelectedSummaryId(createdSummary.id));
      },
    });
  }

  function handleFinalize() {
    if (!selectedSummary) {
      return;
    }

    finalizeMutation.mutate({
      id: selectedSummary.id,
    }, {
      onSuccess: () => {
        setIsDrawerOpen(false);
      }
    });
  }

  function clearSelection() {
    setSelectedSummaryId(null);
    setSelectedAdmissionId("");
    form.reset(defaultValues);
    setIsDrawerOpen(false);
  }

  return (
    <div className="space-y-6">
      {hideHeader
        ? null
        : (
          <PageHeader
            eyebrow="Phase 4 discharge documents"
            title="Discharge summary builder"
            description="Draft, revise, and finalize A4-ready discharge summaries against real admissions. Each save increments a stored version snapshot before the document is sealed."
            actions={
              <Button
                onClick={() => void dischargeQuery.refetch()}
                size="sm"
                type="button"
                variant="outline"
              >
                {dischargeQuery.isFetching
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <RefreshCcw className="h-4 w-4" />}
                Refresh
              </Button>
            }
          />
        )}

      <section className="grid gap-4 xl:grid-cols-5">
        {[
          ["Summaries", summary?.total ?? 0, "Stored discharge records"],
          ["Drafts", summary?.drafts ?? 0, "Still editable"],
          ["Finalized", summary?.finalized ?? 0, "Locked for print/export"],
          ["Ready", summary?.readyToFinalize ?? 0, "Can be sealed now"],
          [
            "Missing summary",
            summary?.admissionsWithoutSummary ?? 0,
            "Admissions without discharge docs",
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

      <FormDrawer
        contentClassName="pb-0"
        description={selectedSummary
          ? "Update the clinical journey and final advice for this patient."
          : "Fill in the clinical details to start a new discharge summary draft."}
        footer={canManage
          ? (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="management-selection-pill px-4 py-3 text-sm leading-6 text-muted-foreground">
                {isFinalizedSelection
                  ? "Finalized summaries are locked for editing and remain available as read-only clinical print records."
                  : "Each save preserves the working document trail before final sealing."}
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                {selectedSummary ? (
                  <a
                    className={buttonVariants({ variant: "outline" })}
                    href={`/dashboard/print/discharge/${selectedSummary.id}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Printer className="h-4 w-4" />
                    Print summary
                  </a>
                ) : null}
                <Button
                  onClick={clearSelection}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Close
                </Button>
                <Button
                  disabled={Boolean(isFinalizedSelection) || createMutation.isPending || updateMutation.isPending}
                  form={dischargeFormId}
                  type="submit"
                >
                  {createMutation.isPending || updateMutation.isPending 
                    ? <Loader2 className="h-4 w-4 animate-spin" /> 
                    : <ClipboardPen className="h-4 w-4" />}
                  {selectedSummary ? "Save draft" : "Create draft"}
                </Button>
                {selectedSummary && selectedSummary.status === "DRAFT" ? (
                  <Button
                    disabled={finalizeMutation.isPending}
                    onClick={handleFinalize}
                    type="button"
                    variant="outline"
                  >
                    {finalizeMutation.isPending 
                      ? <Loader2 className="h-4 w-4 animate-spin" /> 
                      : <FileCheck2 className="h-4 w-4" />}
                    Finalize summary
                  </Button>
                ) : null}
              </div>
            </div>
          )
          : null}
        mode={selectedSummary ? "edit" : "create"}
        onOpenChange={(open: boolean) => {
          setIsDrawerOpen(open);
          if (!open) clearSelection();
        }}
        open={isDrawerOpen}
        statusLabel={selectedSummary?.status}
        title={selectedSummary ? "Revise discharge draft" : "Create new summary"}
      >
        {canManage ? (
          <form
            className="space-y-5"
            id={dischargeFormId}
            onSubmit={form.handleSubmit((values) => {
              handleSubmit(values);
              setIsDrawerOpen(false);
            })}
          >
            <FormDrawerSection
              description="Select the admission first so the summary remains linked to the real inpatient encounter."
              title="Admission link"
            >
              <label className="block">
                <span className="text-sm font-medium text-ink">Admission</span>
                <ThemedSelect
                  {...form.register("admissionId")}
                  className="mt-2"
                  disabled={Boolean(selectedSummary)}
                  onChange={(event) => {
                    setSelectedAdmissionId(event.target.value);
                    form.setValue("admissionId", event.target.value);
                  }}
                >
                  <option value="">Select admission</option>
                  {availableAdmissions.map((admission) => (
                    <option key={admission.id} value={admission.id}>
                      {admission.patientHospitalNumber} - {admission.patientName}
                      {admission.bedNumber ? ` / ${admission.bedNumber}` : ""}
                    </option>
                  ))}
                </ThemedSelect>
                <p className="mt-2 text-sm text-danger">
                  {form.formState.errors.admissionId?.message}
                </p>
              </label>
            </FormDrawerSection>

            <FormDrawerSection
              description="Capture the clinical journey, interventions, medication, and follow-up guidance in one structured draft."
              title="Summary content"
            >
              {[
                ["diagnosis", "Diagnosis", "Primary diagnosis and discharge indication."],
                ["hospitalCourse", "Hospital course summary", "Key admission-to-discharge clinical journey."],
                ["procedures", "Procedures and treatment", "Procedure summary, interventions, and clinical notes."],
                ["dischargeMedication", "Medication on discharge", "Medicines, dosage notes, and continuity instructions."],
                ["dischargeAdvice", "Discharge advice", "Home care instructions, restrictions, red flags."],
                ["followUpInstructions", "Follow-up instructions", "Review date, department, and escalation guidance."],
              ].map(([field, label, placeholder]) => (
                <label key={field} className="block">
                  <span className="text-sm font-medium text-ink">{label}</span>
                  <Textarea
                    {...form.register(field as keyof DischargeFormValues)}
                    className="mt-2 min-h-28"
                    disabled={isFinalizedSelection}
                    placeholder={placeholder}
                  />
                  <p className="mt-2 text-sm text-danger">
                    {form.formState.errors[field as keyof DischargeFormValues]?.message?.toString()}
                  </p>
                </label>
              ))}
            </FormDrawerSection>
          </form>
        ) : (
          <EmptyState
            className="min-h-64"
            description="This clinical module is visible to discharge viewers, but drafting and finalizing summaries requires discharge.create."
            icon={ClipboardPen}
            title="Read-only discharge access"
          />
        )}
      </FormDrawer>

      <section>
        <SurfaceCard className="space-y-5">
          <div className="management-toolbar-shell">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Summary register</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              Admission-linked discharge documents
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Draft, revise, and finalize A4-ready discharge summaries.
            </p>
          </div>
          <div className="management-toolbar-actions">
              <label className="management-search-shell">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  className="h-auto min-w-44 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search patient, UHID, doctor"
                  value={search}
                />
              </label>

              <ThemedSelect
                className="min-w-40"
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as (typeof DISCHARGE_SUMMARY_STATUS)[number] | "ALL"
                  )
                }
                value={statusFilter}
              >
                <option value="ALL">All statuses</option>
                {DISCHARGE_SUMMARY_STATUS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </ThemedSelect>
            </div>
            {canManage && (
              <Button onClick={() => setIsDrawerOpen(true)}>
                <ClipboardPen className="h-4 w-4" />
                New Summary
              </Button>
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <div className="space-y-4">
            {dischargeQuery.isLoading ? (
              <div className="management-subtle-card flex items-center gap-3 px-4 py-5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                Loading discharge summaries
              </div>
            ) : null}

            {!dischargeQuery.isLoading && entries.length === 0 ? (
              <EmptyState
                description="No discharge summaries match the current filter set yet. Create a draft from an available admission to start the document trail."
                icon={FileCheck2}
                title="No discharge summaries"
              />
            ) : null}

            {entries.map((entry) => (
              <article key={entry.id} className="management-record-shell p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold text-foreground">{entry.patientName}</h3>
                        <Badge variant="outline">
                          {entry.patientHospitalNumber}
                        </Badge>
                        <Badge className={statusToneMap[entry.status]} variant="outline">
                          {entry.status}
                        </Badge>
                      </div>

                      <p className="mt-3 text-sm text-muted-foreground">
                        {entry.doctorName || "Doctor pending"}
                        {entry.bedLabel ? ` / ${entry.bedLabel}` : ""}
                      </p>
                    </div>

                    <div className="management-metric px-4 py-3 text-center">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Versions</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{entry.versionCount}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="management-metric px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Diagnosis</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{entry.diagnosis}</p>
                    </div>
                    <div className="management-metric px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Follow-up</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{entry.followUpInstructions}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {canManage ? (
                      <Button
                        onClick={() => {
                          setSelectedAdmissionId(entry.admissionId);
                          setSelectedSummaryId(entry.id);
                          setIsDrawerOpen(true);
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <ClipboardPen className="h-4 w-4" />
                        {entry.status === "FINALIZED" ? "View summary" : "Edit draft"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
