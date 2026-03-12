"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { DashboardFooter } from "@/components/layout/dashboard-footer";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { useAuthUser } from "@/hooks/useAuthUser";
import { navGroups } from "@/lib/module-config";

const SIDEBAR_STORAGE_KEY = "vhms.sidebar.collapsed";

function subscribeToSidebarPreference(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getSidebarPreferenceSnapshot() {
  const storedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
  return storedValue === null ? true : storedValue === "true";
}

function getSidebarPreferenceServerSnapshot() {
  return true;
}

export function DashboardShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const { user } = useAuthUser();
  const permissions = user?.permissions ?? [];
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const [isTopbarCondensed, setIsTopbarCondensed] = useState(false);
  const isSidebarCollapsed = useSyncExternalStore(
    subscribeToSidebarPreference,
    getSidebarPreferenceSnapshot,
    getSidebarPreferenceServerSnapshot,
  );

  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) {
      return;
    }

    const handleScroll = () => {
      setIsTopbarCondensed(scrollArea.scrollTop > 18);
    };

    handleScroll();
    scrollArea.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scrollArea.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) {
      return;
    }

    scrollArea.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  function toggleSidebar() {
    const next = !isSidebarCollapsed;
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: SIDEBAR_STORAGE_KEY,
        newValue: String(next),
      }),
    );
  }

  return (
    <div className="h-screen overflow-hidden pb-4">
      <div className="mx-auto flex h-full max-w-[1460px] gap-3 px-3 py-4 sm:px-4 lg:px-5 xl:px-6">
        <DashboardSidebar
          collapsed={isSidebarCollapsed}
          navGroups={navGroups}
          pathname={pathname}
          permissions={permissions}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DashboardTopbar
            condensed={isTopbarCondensed}
            isSidebarCollapsed={isSidebarCollapsed}
            navGroups={navGroups}
            onToggleSidebar={toggleSidebar}
            pathname={pathname}
            permissions={permissions}
          />
          <div
            className="min-h-0 flex-1 overflow-y-auto pr-1"
            ref={scrollAreaRef}
          >
            <main className="mt-5 min-w-0 pb-5">{children}</main>
            <DashboardFooter />
          </div>
        </div>
      </div>
    </div>
  );
}
