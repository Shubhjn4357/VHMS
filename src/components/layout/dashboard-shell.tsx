"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

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
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const {
    closeTransientUi,
    isSidebarCollapsed,
    setTopbarCondensed,
  } = useAppShell();

  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) {
      return;
    }

    const handleScroll = () => {
      setTopbarCondensed(scrollArea.scrollTop > APP_THEME.layout.topbarCondenseOffset);
    };

    handleScroll();
    scrollArea.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scrollArea.removeEventListener("scroll", handleScroll);
    };
  }, [setTopbarCondensed]);

  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) {
      return;
    }

    closeTransientUi();
    scrollArea.scrollTo({ top: 0, behavior: "auto" });
  }, [closeTransientUi, pathname]);

  return (
    <div className="app-shell-frame overflow-hidden">
      <div
        className="app-shell-max flex h-[calc(100vh-2rem)] gap-4"
        style={{ maxWidth: `${APP_THEME.layout.shellMaxWidth}px` }}
      >
        <DashboardSidebar
          collapsed={isSidebarCollapsed}
          navGroups={navGroups}
          pathname={pathname}
          permissions={permissions}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-panel)] border bg-background shadow-[var(--shadow-soft)]">
          <DashboardTopbar navGroups={navGroups} pathname={pathname} permissions={permissions} />
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-none"
            ref={scrollAreaRef}
          >
            <main className="min-w-0 px-4 pb-10 pt-4 lg:px-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: APP_THEME.motion.pageEnterOffset }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -APP_THEME.motion.pageEnterOffset }}
                  transition={{ duration: APP_THEME.motion.pageEnterDuration, ease: "easeOut" }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </main>
            <DashboardFooter />
          </div>
        </div>
      </div>
    </div>
  );
}
