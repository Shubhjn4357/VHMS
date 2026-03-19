import { Fragment } from "react";

import { NativeImage } from "@/components/ui/native-image";
import type { BillPrintPayload } from "@/types/print";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ThermalBillDocument({
  branding,
  bill,
  template,
}: BillPrintPayload) {
  const sections = {
    branding: (
      <header className="border-b border-dashed border-line pb-3 text-center">
          {branding.logoUrl
            ? (
            <NativeImage
                alt={branding.displayName}
                className="mx-auto mb-2 h-10 w-10 rounded-[var(--radius-control)] object-cover"
                eager
                src={branding.logoUrl}
              />
            )
          : null}
        <p className="text-lg font-semibold">{branding.displayName}</p>
        {branding.address ? <p className="mt-1">{branding.address}</p> : null}
        {branding.contactPhone ? <p>{branding.contactPhone}</p> : null}
      </header>
    ),
    metadata: (
      <section className="space-y-1 border-b border-dashed border-line pb-3">
        <div className="flex justify-between gap-3">
          <span>Bill</span>
          <span className="font-semibold">{bill.billNumber}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Patient</span>
          <span>{bill.patientName}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>UHID</span>
          <span>{bill.patientHospitalNumber}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Date</span>
          <span>{formatDate(bill.updatedAt)}</span>
        </div>
      </section>
    ),
    items: (
      <section className="space-y-2 border-b border-dashed border-line pb-3">
        {bill.items.map((item) => (
          <div key={item.id}>
            <div className="flex justify-between gap-3">
              <span className="max-w-[60%]">{item.description}</span>
              <span className="font-medium">
                {formatCurrency(item.lineTotal)}
              </span>
            </div>
            <div className="flex justify-between gap-3 text-ink-soft">
              <span>
                {item.quantity} x {formatCurrency(item.unitPrice)}
              </span>
              <span>#{item.displayOrder + 1}</span>
            </div>
          </div>
        ))}
      </section>
    ),
    totals: (
      <section className="space-y-1 border-b border-dashed border-line pb-3">
        {[
          ["Subtotal", bill.subtotal],
          ["Discount", bill.discountAmount],
          ["Tax", bill.taxAmount],
          ["Total", bill.totalAmount],
          ["Paid", bill.amountPaid],
          ["Balance", bill.balanceAmount],
        ].map(([label, value]) => (
          <div key={String(label)} className="flex justify-between gap-3">
            <span>{label}</span>
            <span className="font-semibold">
              {formatCurrency(Number(value))}
            </span>
          </div>
        ))}
      </section>
    ),
    footer: (
      <footer className="text-center text-[10px] text-ink-soft">
        <p>{bill.paymentStatus.replaceAll("_", " ")}</p>
        {branding.letterheadFooter
          ? <p className="mt-1">{branding.letterheadFooter}</p>
          : null}
      </footer>
    ),
  } as const;

  return (
    <article className="print-sheet thermal-sheet space-y-3 text-[11px] text-ink">
      {template.sections.map((section) => {
        const key = section.key as keyof typeof sections;

        return <Fragment key={section.key}>{sections[key] ?? null}</Fragment>;
      })}
    </article>
  );
}
