import { dashboardDischargeSummariesMetadata as metadata } from "@/app/dashboard/page-metadata";
import Link from "next/link";
import { ClipboardCheck, FileText } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { listDischargeSummaries } from "@/lib/discharge/service";

export { metadata };

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not finalized";
  }

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function DashboardDischargeSummariesPage() {
  const workspace = await listDischargeSummaries();
  const readyEntries = workspace.entries.filter((entry) =>
    entry.status === "DRAFT" &&
    entry.diagnosis.trim() &&
    entry.hospitalCourse.trim() &&
    entry.dischargeAdvice.trim() &&
    entry.followUpInstructions.trim()
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clinical documentation"
        title="Discharge summaries"
        description="Review summary completion, revision depth, and finalization posture from a dedicated discharge document route."
        actions={
          <>
            <Link className={buttonVariants({ variant: "outline" })} href="/dashboard/discharge">
              Open discharge workspace
            </Link>
            <Link className={buttonVariants({ variant: "outline" })} href="/dashboard/print-templates">
              Print templates
            </Link>
          </>
        }
      />

      <section className="grid gap-4 lg:grid-cols-4">
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Summaries</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {workspace.summary.total}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Discharge summary records currently available in the clinical document store.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Drafts</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {workspace.summary.drafts}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Summaries still open for edits before formal finalization.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Ready to finalize</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {readyEntries.length}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Drafts with the required sections already filled out.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Admissions missing summary</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {workspace.summary.admissionsWithoutSummary}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Admissions that still need a discharge document started.
          </p>
        </SurfaceCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SurfaceCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Summary directory
              </p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Patient discharge records with document status, attending clinician, and revision count.
              </p>
            </div>
            <FileText className="h-5 w-5 text-brand" />
          </div>

          <div className="mt-5 grid gap-3">
            {workspace.entries.length > 0
              ? workspace.entries.map((entry) => (
                <div className="management-subtle-card p-4" key={entry.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{entry.patientName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {entry.patientHospitalNumber}
                        {entry.doctorName ? ` / ${entry.doctorName}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={entry.status === "FINALIZED" ? "success" : "warning"}>
                        {entry.status}
                      </Badge>
                      <Badge variant="outline">v{entry.versionCount}</Badge>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-muted-foreground">
                    {entry.diagnosis}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <span>{entry.bedLabel ?? "No bed mapped"}</span>
                    <span>Finalized: {formatDateTime(entry.finalizedAt)}</span>
                    {entry.status === "FINALIZED"
                      ? (
                        <Link
                          className="text-brand transition hover:text-brand-strong"
                          href={`/dashboard/print/discharge/${entry.id}`}
                        >
                          Open print view
                        </Link>
                      )
                      : null}
                  </div>
                </div>
              ))
              : (
                <EmptyState
                  className="min-h-56"
                  description="Discharge summaries will appear here once admitted cases begin reaching the discharge documentation step."
                  icon={FileText}
                  title="No discharge summaries yet"
                />
              )}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Finalization posture
              </p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Draft readiness and finalized completion across the current discharge stack.
              </p>
            </div>
            <ClipboardCheck className="h-5 w-5 text-brand" />
          </div>

          <div className="mt-5 space-y-3">
            <div className="management-subtle-card p-4">
              <p className="text-sm font-semibold text-foreground">Finalized records</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                {workspace.summary.finalized}
              </p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Summaries already locked for printing and clinical handoff.
              </p>
            </div>
            <div className="management-subtle-card p-4">
              <p className="text-sm font-semibold text-foreground">Ready drafts</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                {readyEntries.length}
              </p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Drafts that can move to finalization without missing required fields.
              </p>
            </div>
            <div className="management-subtle-card p-4">
              <p className="text-sm font-semibold text-foreground">Linked admissions</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                {workspace.admissions.length}
              </p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Admission records currently available for discharge-document linkage.
              </p>
            </div>
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
