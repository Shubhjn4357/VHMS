import { APP_TEXT } from "@/constants/appText";

export function DashboardFooter() {
  return (
    <footer className="mt-8 rounded-[var(--radius-panel)] border bg-card px-6 py-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="text-sm text-muted-foreground">
          <p>{APP_TEXT.SHELL.FOOTER_ACCESS}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground/72">
            v4.0.1
          </p>
        </div>
      </div>
    </footer>
  );
}
