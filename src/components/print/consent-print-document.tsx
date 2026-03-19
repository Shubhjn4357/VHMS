import { Fragment } from "react";

import { NativeImage } from "@/components/ui/native-image";
import type { ConsentPrintPayload } from "@/types/print";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Pending";
  }

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ConsentPrintDocument({
  branding,
  document,
  template,
}: ConsentPrintPayload) {
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
              Consent document
            </p>
            <p className="mt-3 text-lg font-semibold text-ink">
              {document.templateName}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              {document.patientName} | {document.patientHospitalNumber}
            </p>
          </div>
        </div>
      </header>
    ),
    documentDetails: (
      <section className="rounded-[var(--radius-panel)] border border-line p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Document details
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Patient</dt>
            <dd className="font-medium text-ink">{document.patientName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">UHID</dt>
            <dd className="font-medium text-ink">
              {document.patientHospitalNumber}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Procedure</dt>
            <dd className="font-medium text-ink">
              {document.procedureName ?? "General consent"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Admission</dt>
            <dd className="font-medium text-ink">
              {document.admissionId ?? "Outpatient / not linked"}
            </dd>
          </div>
        </dl>
      </section>
    ),
    signatureState: (
      <section className="rounded-[var(--radius-panel)] border border-line p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Signature state
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Status</dt>
            <dd className="font-medium text-ink">
              {document.status.replaceAll("_", " ")}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Witness required</dt>
            <dd className="font-medium text-ink">
              {document.requiresWitness ? "Yes" : "No"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Doctor required</dt>
            <dd className="font-medium text-ink">
              {document.requiresDoctor ? "Yes" : "No"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Finalized</dt>
            <dd className="font-medium text-ink">
              {formatTimestamp(document.finalizedAt)}
            </dd>
          </div>
        </dl>
      </section>
    ),
    content: (
      <section className="rounded-[var(--radius-panel)] border border-line p-6">
        <p className="whitespace-pre-wrap text-sm leading-8 text-ink-soft">
          {document.renderedBody}
        </p>
      </section>
    ),
    signatures: (
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          Signature blocks
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {document.signatures.map((signature) => (
            <div
              key={signature.id}
              className="rounded-[var(--radius-panel)] border border-line p-5"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">
                {signature.signerRole.replaceAll("_", " ")}
              </p>
              <p className="mt-3 text-lg font-semibold text-ink">
                {signature.signerName}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {signature.mode.replaceAll("_", " ")}
              </p>
              <p className="mt-4 text-sm text-ink-soft">
                Signed {formatTimestamp(signature.signedAt)}
              </p>
              {signature.notes
                ? (
                  <p className="mt-2 text-sm text-ink-soft">
                    {signature.notes}
                  </p>
                )
                : null}
            </div>
          ))}
        </div>
      </section>
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
