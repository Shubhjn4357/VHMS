import { Fragment } from "react";

import { NativeImage } from "@/components/ui/native-image";
import type { DischargePrintPayload } from "@/types/print";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Section({
  title,
  content,
}: {
  title: string;
  content: string | null;
}) {
  if (!content) {
    return null;
  }

  return (
    <section className="space-y-2 rounded-[var(--radius-panel)] border border-line p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
        {title}
      </h2>
      <p className="whitespace-pre-wrap text-sm leading-7 text-ink-soft">
        {content}
      </p>
    </section>
  );
}

export function DischargePrintDocument({
  branding,
  summary,
  template,
}: DischargePrintPayload) {
  const sections = {
    branding: (
      <header className="border-b border-line pb-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-3xl font-semibold tracking-tight text-ink">
              {branding.displayName}
            </p>
            <p className="mt-2 text-sm text-ink-soft">{branding.legalName}</p>
            <p className="mt-1 text-sm text-ink-soft">{branding.address}</p>
          </div>
          <div className="text-right">
              {branding.logoUrl
                ? (
                <NativeImage
                    alt={branding.displayName}
                    className="ml-auto mb-3 h-14 w-14 rounded-[var(--radius-control)] border border-line object-cover"
                    eager
                    src={branding.logoUrl}
                  />
                )
              : null}
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
              Discharge summary
            </p>
            <p className="mt-3 text-lg font-semibold text-ink">
              {summary.patientName}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              UHID {summary.patientHospitalNumber}
            </p>
          </div>
        </div>
      </header>
    ),
    admission: (
      <section className="rounded-[var(--radius-panel)] border border-line p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Admission details
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Admission</dt>
            <dd className="font-medium text-ink">{summary.admissionId}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Doctor</dt>
            <dd className="font-medium text-ink">
              {summary.doctorName ?? "Not linked"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Bed</dt>
            <dd className="font-medium text-ink">
              {summary.bedLabel ?? "Bed released"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Admitted</dt>
            <dd className="font-medium text-ink">
              {formatTimestamp(summary.admittedAt)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Discharged</dt>
            <dd className="font-medium text-ink">
              {formatTimestamp(summary.dischargedAt)}
            </dd>
          </div>
        </dl>
      </section>
    ),
    documentStatus: (
      <section className="rounded-[var(--radius-panel)] border border-line p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Document status
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Summary status</dt>
            <dd className="font-medium text-ink">
              {summary.status.replaceAll("_", " ")}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Admission status</dt>
            <dd className="font-medium text-ink">
              {summary.admissionStatus.replaceAll("_", " ")}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Version count</dt>
            <dd className="font-medium text-ink">{summary.versionCount}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Finalized</dt>
            <dd className="font-medium text-ink">
              {formatTimestamp(summary.finalizedAt)}
            </dd>
          </div>
        </dl>
      </section>
    ),
    diagnosis: <Section title="Diagnosis" content={summary.diagnosis} />,
    hospitalCourse: (
      <Section title="Hospital course" content={summary.hospitalCourse} />
    ),
    procedures: <Section title="Procedures" content={summary.procedures} />,
    medication: (
      <Section
        title="Medication on discharge"
        content={summary.dischargeMedication}
      />
    ),
    dischargeAdvice: (
      <Section title="Discharge advice" content={summary.dischargeAdvice} />
    ),
    followUp: (
      <Section
        title="Follow-up instructions"
        content={summary.followUpInstructions}
      />
    ),
    signOff: (
      <footer className="grid gap-8 border-t border-line pt-8 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            Clinical note
          </p>
          <p className="mt-3 text-sm leading-7 text-ink-soft">
            This summary reflects the stored discharge record and should be used
            with the live audit trail for any post-discharge clarification.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            Doctor sign-off
          </p>
          <div className="mt-12 border-t border-line pt-3 text-sm text-ink-soft">
            {summary.doctorName ?? "Attending doctor"}
          </div>
        </div>
      </footer>
    ),
  } as const;

  return (
    <article className="print-sheet a4-sheet space-y-8 text-[13px] text-ink">
      {template.sections.map((section) => {
        const key = section.key as keyof typeof sections;

        return <Fragment key={section.key}>{sections[key] ?? null}</Fragment>;
      })}
    </article>
  );
}
