import Link from "next/link";

import { dashboardIpdMetadata as metadata } from "@/app/dashboard/page-metadata";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { getIpdWorkspace } from "@/lib/workflows/service";

export { metadata };

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DashboardIpdPage() {
  const workspace = await getIpdWorkspace();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inpatient workflow"
        title="IPD command board"
        description="Track live admissions, bed occupancy, discharge preparation, and pending consent work from a route backed by real inpatient records."
        actions={(
          <>
            <Link
              className={buttonVariants({ variant: "outline" })}
              href="/dashboard/rooms"
            >
              Rooms and beds
            </Link>
            <Link
              className={buttonVariants({ variant: "default" })}
              href="/dashboard/occupancy"
            >
              Open occupancy board
            </Link>
          </>
        )}
      />

      <section className="grid gap-4 xl:grid-cols-5">
        {[
          ["Active admissions", workspace.summary.activeAdmissions],
          ["Occupied beds", workspace.summary.occupiedBeds],
          ["Available beds", workspace.summary.availableBeds],
          ["Pending discharge", workspace.summary.pendingDischargeSummaries],
          ["Pending consents", workspace.summary.pendingConsents],
        ].map(([label, value]) => (
          <SurfaceCard key={String(label)}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {value}
            </p>
          </SurfaceCard>
        ))}
      </section>

      <section className="grid gap-6 2xl:grid-cols-[1.08fr_0.92fr]">
        <SurfaceCard>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Active admissions
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Bed, discharge, and consent status
          </h2>

          <div className="mt-6 space-y-4">
            {workspace.activeAdmissions.length === 0
              ? (
                <div className="management-subtle-card px-5 py-6 text-sm text-muted-foreground">
                  No active IPD admissions are open right now.
                </div>
              )
              : workspace.activeAdmissions.map((admission) => (
                <article
                  className="management-subtle-card p-4"
                  key={admission.admissionId}
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-foreground">
                          {admission.patientName}
                        </h3>
                        <Badge className="uppercase tracking-[0.16em]" variant="outline">
                          {admission.patientHospitalNumber}
                        </Badge>
                        <Badge
                          className="status-pill-neutral border-transparent uppercase tracking-[0.16em]"
                          variant="outline"
                        >
                          {admission.wardName ?? "Unmapped ward"} / {admission.roomNumber ?? "--"} / {admission.bedNumber ?? "--"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Admitted {formatDateTime(admission.admittedAt)} / Doctor {admission.doctorName ?? "Not linked"}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Discharge {admission.dischargeSummaryStatus ?? "Not started"} / Pending consents {admission.consentPending}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        className={buttonVariants({ size: "sm", variant: "outline" })}
                        href={`/dashboard/occupancy?q=${encodeURIComponent(admission.patientHospitalNumber)}`}
                      >
                        Open bed
                      </Link>
                      <Link
                        className={buttonVariants({ size: "sm", variant: "outline" })}
                        href={`/dashboard/discharge-summaries?q=${encodeURIComponent(admission.patientHospitalNumber)}`}
                      >
                        Discharge
                      </Link>
                      <Link
                        className={buttonVariants({ size: "sm", variant: "default" })}
                        href={`/dashboard/consents?q=${encodeURIComponent(admission.patientHospitalNumber)}`}
                      >
                        Consents
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
          </div>
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Discharge drafting
            </p>
            <div className="mt-5 space-y-3">
              {workspace.recentDischargeDrafts.length === 0
                ? (
                  <div className="management-subtle-card px-4 py-5 text-sm text-muted-foreground">
                    No discharge drafts are pending right now.
                  </div>
                )
                : workspace.recentDischargeDrafts.map((entry) => (
                  <div
                    className="management-subtle-card p-4"
                    key={entry.id}
                  >
                    <p className="font-semibold text-foreground">{entry.patientName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {entry.patientHospitalNumber} / {entry.status.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Updated {formatDateTime(entry.updatedAt)}
                    </p>
                    <Link
                      className={`${buttonVariants({ size: "sm", variant: "outline" })} mt-4`}
                      href={`/dashboard/discharge-summaries?q=${encodeURIComponent(entry.patientHospitalNumber)}`}
                    >
                      Open draft
                    </Link>
                  </div>
                ))}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Pending consents
            </p>
            <div className="mt-5 space-y-3">
              {workspace.pendingConsentDocuments.length === 0
                ? (
                  <div className="management-subtle-card px-4 py-5 text-sm text-muted-foreground">
                    No pending consent documents are waiting for signatures.
                  </div>
                )
                : workspace.pendingConsentDocuments.map((entry) => (
                  <div
                    className="management-subtle-card p-4"
                    key={entry.id}
                  >
                    <p className="font-semibold text-foreground">{entry.patientName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {entry.templateName} / {entry.status.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {entry.patientHospitalNumber} / Updated {formatDateTime(entry.updatedAt)}
                    </p>
                    <Link
                      className={`${buttonVariants({ size: "sm", variant: "outline" })} mt-4`}
                      href={`/dashboard/consents?q=${encodeURIComponent(entry.patientHospitalNumber)}`}
                    >
                      Open consent
                    </Link>
                  </div>
                ))}
            </div>
          </SurfaceCard>
        </div>
      </section>
    </div>
  );
}
