"use client";

import { ArrowLeft, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

type PrintToolbarProps = {
  title: string;
  subtitle?: string;
};

export function PrintToolbar({ title, subtitle }: PrintToolbarProps) {
  return (
    <div className="print-toolbar flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-line bg-surface px-5 py-4 shadow-[var(--shadow-soft)]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">
          Print preview
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {subtitle
          ? <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>
          : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => history.back()}
          size="sm"
          type="button"
          variant="outline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={() => window.print()}
          type="button"
        >
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>
    </div>
  );
}
