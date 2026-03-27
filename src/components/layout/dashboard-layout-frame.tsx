"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";

function subscribeToHydration() {
  return () => {};
}

export function DashboardLayoutFrame({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  if (pathname.startsWith("/dashboard/print/")) {
    return <>{children}</>;
  }

  if (!mounted) {
    return (
      <div className="app-shell-frame">
        <div className="app-shell-max">
          <div className="flex min-h-[calc(100dvh-2rem)] flex-col gap-4 lg:flex-row lg:items-start">
            <aside className="hidden shrink-0 lg:sticky lg:top-4 lg:flex lg:h-[calc(100dvh-2rem)] lg:w-72 lg:flex-col lg:self-start">
              <div className="h-[calc(100dvh-2rem)] min-h-0 rounded-[calc(var(--radius-panel)+0.35rem)] border border-sidebar-border bg-sidebar shadow-[var(--shadow-soft)]" />
            </aside>

            <div className="app-shell-panel flex min-h-[calc(100dvh-2rem)] min-w-0 flex-1 flex-col rounded-[calc(var(--radius-panel)+0.35rem)]">
              <div className="sticky top-0 z-30 mx-1 mt-1 h-[4.5rem] rounded-[calc(var(--radius-panel)+0.15rem)] border border-border/75 bg-background/88 shadow-[var(--shadow-soft)] backdrop-blur supports-[backdrop-filter]:bg-background/72" />
              <main className="min-w-0 px-4 pb-8 pt-4 sm:px-5 lg:px-6">
                <div className="space-y-6">{children}</div>
              </main>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <DashboardShell>{children}</DashboardShell>;
}
