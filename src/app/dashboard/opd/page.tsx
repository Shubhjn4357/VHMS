import Link from "next/link";

import { dashboardOpdMetadata as metadata } from "@/app/dashboard/page-metadata";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { buttonVariants } from "@/components/ui/button";
import { getOpdWorkspace } from "@/lib/workflows/service";

export { metadata };

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value: number | null) {
  if (!value) {
    return "Rs 0";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function DashboardOpdPage() {
  const workspace = await getOpdWorkspace();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Outpatient workflow"
        title="OPD command board"
        description="Run appointment intake, live OPD billing, and OPD-to-IPD handoff from one route backed by today’s real appointment and billing data."
        actions={(
          <>
            <Link
              className={buttonVariants({ variant: "outline" })}
              href="/dashboard/patients/new"
            >
              Register patient
            </Link>
            <Link
              className={buttonVariants({ variant: "default" })}
              href="/dashboard/appointments/new"
            >
              New appointment
            </Link>
          </>
        )}
      />

      <section className="grid gap-4 xl:grid-cols-5">
        {[
          ["Scheduled today", workspace.summary.scheduledToday],
          ["Checked in", workspace.summary.checkedInToday],
          ["Completed", workspace.summary.completedToday],
          ["Waiting for billing", workspace.summary.waitingForBilling],
          ["Unpaid OPD bills", workspace.summary.unpaidOpdBills],
        ].map(([label, value]) => (
          <SurfaceCard key={String(label)}>
            <p className="text-sm text-ink-soft">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">
              {value}
            </p>
          </SurfaceCard>
        ))}
      </section>

      <section className="grid gap-6 2xl:grid-cols-[1.12fr_0.88fr]">
        <SurfaceCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Today&apos;s OPD queue
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                Intake, consultation, billing, and handoff
              </h2>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {workspace.todayVisits.length === 0
              ? (
                <div className="glass-panel-muted rounded-[24px] px-5 py-6 text-sm text-ink-soft">
                  No OPD appointments are scheduled for today yet.
                </div>
              )
              : workspace.todayVisits.map((visit) => (
                <article
                  className="glass-panel-muted rounded-[24px] p-4"
                  key={visit.appointmentId}
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-ink">
                          {visit.patientName}
                        </h3>
                        <span className="glass-chip rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                          {visit.patientHospitalNumber}
                        </span>
                        <span className="glass-chip rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                          {visit.status.replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-ink-soft">
                        {formatDateTime(visit.scheduledFor)} / {visit.doctorName}
                        {visit.doctorDepartment ? ` / ${visit.doctorDepartment}` : ""}
                      </p>
                      <p className="mt-2 text-sm text-ink-soft">
                        {visit.billNumber
                          ? `${visit.billNumber} / ${
                            visit.paymentStatus?.replaceAll("_", " ") ?? "No payment state"
                          } / Balance ${formatCurrency(visit.balanceAmount)}`
                          : "Billing not started yet"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {!visit.billId
                        ? (
                          <Link
                            className={buttonVariants({ size: "sm", variant: "outline" })}
                            href={`/dashboard/billing/create?appointmentId=${visit.appointmentId}`}
                          >
                            Create OPD bill
                          </Link>
                        )
                        : (
                          <Link
                            className={buttonVariants({ size: "sm", variant: "outline" })}
                            href={`/dashboard/billing?q=${encodeURIComponent(visit.billNumber ?? visit.patientHospitalNumber)}`}
                          >
                            Open bill
                          </Link>
                        )}
                      <Link
                        className={buttonVariants({ size: "sm", variant: "outline" })}
                        href={`/dashboard/appointments?q=${encodeURIComponent(visit.patientHospitalNumber)}`}
                      >
                        Open appointment
                      </Link>
                      {["CHECKED_IN", "COMPLETED"].includes(visit.status)
                        ? (
                          <Link
                            className={buttonVariants({ size: "sm", variant: "default" })}
                            href={`/dashboard/occupancy?sourceAppointmentId=${visit.appointmentId}`}
                          >
                            Admit to IPD
                          </Link>
                        )
                        : null}
                    </div>
                  </div>
                </article>
              ))}
          </div>
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Recent registrations
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              Fresh patient records available for intake
            </h2>
            <div className="mt-6 space-y-3">
              {workspace.recentPatients.map((patient) => (
                <div
                  className="glass-panel-muted rounded-[22px] p-4"
                  key={patient.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{patient.fullName}</p>
                      <p className="text-sm text-ink-soft">
                        {patient.hospitalNumber} / Added {formatDateTime(patient.createdAt)}
                      </p>
                    </div>
                    <Link
                      className={buttonVariants({ size: "sm", variant: "outline" })}
                      href={`/dashboard/patients?q=${encodeURIComponent(patient.hospitalNumber)}`}
                    >
                      Open
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              OPD next actions
            </p>
            <div className="mt-5 grid gap-3">
              {[
                ["Live appointments", "/dashboard/appointments", "Review queue movement, check-in state, and doctor throughput."],
                ["Billing register", "/dashboard/billing", "Follow settlement, unpaid OPD balances, and invoice completion."],
                ["Analytics", "/dashboard/analytics", "Track outpatient load and revenue on the main dashboard analytics route."],
              ].map(([label, href, detail]) => (
                <div
                  className="glass-panel-muted rounded-[22px] p-4"
                  key={String(label)}
                >
                  <p className="font-semibold text-ink">{label}</p>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">{detail}</p>
                  <Link
                    className={`${buttonVariants({ size: "sm", variant: "outline" })} mt-4`}
                    href={String(href)}
                  >
                    Open
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
