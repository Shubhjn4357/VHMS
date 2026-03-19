import { Fragment } from "react";

import { NativeImage } from "@/components/ui/native-image";
import type { BillPrintPayload } from "@/types/print";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function A4BillDocument({ branding, bill, template }: BillPrintPayload) {
  const sections = {
    branding: (
      <section className="border-b border-line pb-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-3xl font-semibold tracking-tight text-ink">
              {branding.displayName}
            </p>
            <p className="mt-2 text-sm text-ink-soft">{branding.legalName}</p>
            <p className="mt-1 text-sm text-ink-soft">{branding.address}</p>
            <p className="mt-1 text-sm text-ink-soft">
              {branding.contactPhone}
              {branding.contactEmail ? ` | ${branding.contactEmail}` : ""}
            </p>
          </div>
            {branding.logoUrl
              ? (
              <NativeImage
                  alt={branding.displayName}
                  className="h-16 w-16 rounded-[var(--radius-control)] border border-line object-cover"
                  eager
                  src={branding.logoUrl}
                />
              )
            : null}
        </div>
      </section>
    ),
    metadata: (
      <section className="rounded-[var(--radius-panel)] border border-line p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Tax invoice
        </p>
        <p className="mt-3 text-2xl font-semibold text-ink">
          {bill.billNumber}
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Generated {formatTimestamp(bill.updatedAt)}
        </p>
        {branding.registrationNumber
          ? (
            <p className="mt-1 text-sm text-ink-soft">
              Registration {branding.registrationNumber}
            </p>
          )
          : null}
      </section>
    ),
    patient: (
      <section className="rounded-[var(--radius-panel)] border border-line p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Patient details
        </p>
        <dl className="mt-4 space-y-2">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Patient</dt>
            <dd className="font-medium text-ink">{bill.patientName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">UHID</dt>
            <dd className="font-medium text-ink">
              {bill.patientHospitalNumber}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Doctor</dt>
            <dd className="font-medium text-ink">
              {bill.doctorName ?? "Not linked"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Department</dt>
            <dd className="font-medium text-ink">
              {bill.doctorDepartment ?? "Not linked"}
            </dd>
          </div>
        </dl>
      </section>
    ),
    billingStatus: (
      <section className="rounded-[var(--radius-panel)] border border-line p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Billing status
        </p>
        <dl className="mt-4 space-y-2">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Bill status</dt>
            <dd className="font-medium text-ink">
              {bill.billStatus.replaceAll("_", " ")}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Payment</dt>
            <dd className="font-medium text-ink">
              {bill.paymentStatus.replaceAll("_", " ")}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Visit time</dt>
            <dd className="font-medium text-ink">
              {formatTimestamp(bill.appointmentScheduledFor)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Created</dt>
            <dd className="font-medium text-ink">
              {formatTimestamp(bill.createdAt)}
            </dd>
          </div>
        </dl>
      </section>
    ),
    itemizedTable: (
      <section>
        <table className="w-full border-collapse overflow-hidden rounded-[var(--radius-panel)] border border-line">
          <thead className="bg-surface-alt text-left text-xs uppercase tracking-[0.16em] text-ink-soft">
            <tr>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Rate</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">{item.description}</td>
                <td className="px-4 py-3 text-right">{item.quantity}</td>
                <td className="px-4 py-3 text-right">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCurrency(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    ),
    financialSummary: (
      <section className="ml-auto grid max-w-sm gap-3 rounded-[var(--radius-panel)] border border-line p-5">
        {[
          ["Subtotal", bill.subtotal],
          ["Discount", bill.discountAmount],
          ["Tax", bill.taxAmount],
          ["Total", bill.totalAmount],
          ["Amount paid", bill.amountPaid],
          ["Balance", bill.balanceAmount],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="flex items-center justify-between gap-4"
          >
            <span className="text-ink-soft">{label}</span>
            <span className="font-semibold text-ink">
              {formatCurrency(Number(value))}
            </span>
          </div>
        ))}
      </section>
    ),
    signatures: (
      <footer className="grid gap-8 border-t border-line pt-8 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            Notes
          </p>
          <p className="mt-3 text-sm leading-7 text-ink-soft">
            This invoice is generated from the VHMS billing engine. Final
            settlement should match the live application status and audit trail.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            Authorized signatory
          </p>
          <div className="mt-12 border-t border-line pt-3 text-sm text-ink-soft">
            Billing desk / accounts office
          </div>
        </div>
      </footer>
    ),
    footer: branding.letterheadFooter
      ? (
        <p className="border-t border-line pt-4 text-center text-xs text-ink-soft">
          {branding.letterheadFooter}
        </p>
      )
      : null,
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
