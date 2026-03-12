export function DashboardFooter() {
  return (
    <footer className="glass-panel mt-5 rounded-[22px] px-4 py-3 text-sm text-muted-foreground">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>VHMS admin shell with invite-only access, typed modules, and theme-aware tokens.</p>
        <p className="text-xs uppercase tracking-[0.16em]">
          Header / Sidebar / Main / Footer
        </p>
      </div>
    </footer>
  );
}
