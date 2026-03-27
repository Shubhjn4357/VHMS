"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { DashboardFooter } from "@/components/layout/dashboard-footer";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { APP_THEME } from "@/constants/appTheme";
import { useAppShell } from "@/hooks/useAppShell";
import { useAuthUser } from "@/hooks/useAuthUser";
import { navGroups } from "@/lib/module-config";

export function DashboardShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const { user } = useAuthUser();
  const permissions = user?.permissions ?? [];
  const { closeTransientUi, isSidebarCollapsed } = useAppShell();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    closeTransientUi();
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [closeTransientUi, pathname]);

  return (
    <div className="app-shell-frame">
      <div
        className="app-shell-max"
        style={{ maxWidth: `${APP_THEME.layout.shellMaxWidth}px` }}
      >
        <div className="flex min-h-[calc(100dvh-2rem)] flex-col gap-4 lg:flex-row lg:items-start">
          <DashboardSidebar
            collapsed={isSidebarCollapsed}
            navGroups={navGroups}
            pathname={pathname}
            permissions={permissions}
          />

          <div className="app-shell-panel flex min-h-[calc(100dvh-2rem)] min-w-0 flex-1 flex-col rounded-[calc(var(--radius-panel)+0.35rem)]">
            <DashboardTopbar navGroups={navGroups} pathname={pathname} permissions={permissions} />
            <main className="min-w-0 px-4 pb-8 pt-4 sm:px-5 lg:px-6">
              <div className="space-y-6" key={pathname}>
                {children}
              </div>
              <DashboardFooter />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
