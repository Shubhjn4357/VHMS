import { APP_TEXT } from "@/constants/appText";

export function DashboardFooter() {
  return (
    <footer className="mt-8 rounded-[var(--radius-panel)] border bg-[linear-gradient(145deg,color-mix(in_srgb,var(--card)_95%,white_5%)_0%,color-mix(in_srgb,var(--card)_86%,var(--accent)_14%)_100%)] px-6 py-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/72">
              {APP_TEXT.SHELL.FOOTER_PRODUCT}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {APP_TEXT.SHELL.FOOTER_NOTE}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <div className="management-selection-pill px-4 py-2">
            {APP_TEXT.SHELL.FOOTER_ACCESS}
          </div>
          <div className="management-selection-pill px-4 py-2">
            Single-hospital deployment
          </div>
          <div className="management-selection-pill px-4 py-2">
            v4.0.1
          </div>
        </div>
      </div>
    </footer>
  );
}
