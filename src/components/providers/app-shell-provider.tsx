"use client";

import {
  createContext,
  startTransition,
  useContext,
  useState,
  useSyncExternalStore,
} from "react";

import { APP_THEME } from "@/constants/appTheme";

type AppShellContextValue = {
  isSidebarCollapsed: boolean;
  isMobileNavOpen: boolean;
  isGlobalSearchOpen: boolean;
  isTopbarCondensed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
  setGlobalSearchOpen: (open: boolean) => void;
  setTopbarCondensed: (condensed: boolean) => void;
  closeTransientUi: () => void;
};

const AppShellContext = createContext<AppShellContextValue | null>(null);
const SIDEBAR_PREF_EVENT = "app-shell:sidebar-collapsed";

function getSidebarCollapsedSnapshot() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(APP_THEME.storageKeys.sidebarCollapsed) ===
    "true";
}

function subscribeToSidebarCollapsed(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === APP_THEME.storageKeys.sidebarCollapsed) {
      callback();
    }
  };
  const handlePreferenceChange = () => {
    callback();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(SIDEBAR_PREF_EVENT, handlePreferenceChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(SIDEBAR_PREF_EVENT, handlePreferenceChange);
  };
}

function updateSidebarCollapsedPreference(collapsed: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    APP_THEME.storageKeys.sidebarCollapsed,
    String(collapsed),
  );
  window.dispatchEvent(new Event(SIDEBAR_PREF_EVENT));
}

export function AppShellProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isSidebarCollapsed = useSyncExternalStore(
    subscribeToSidebarCollapsed,
    getSidebarCollapsedSnapshot,
    () => false,
  );
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  const [isGlobalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [isTopbarCondensed, setTopbarCondensed] = useState(false);

  function setSidebarCollapsed(collapsed: boolean) {
    startTransition(() => {
      updateSidebarCollapsedPreference(collapsed);
    });
  }

  function toggleSidebar() {
    startTransition(() => {
      updateSidebarCollapsedPreference(!isSidebarCollapsed);
    });
  }

  function closeTransientUi() {
    setMobileNavOpen(false);
    setGlobalSearchOpen(false);
  }

  return (
    <AppShellContext.Provider
      value={{
        isSidebarCollapsed,
        isMobileNavOpen,
        isGlobalSearchOpen,
        isTopbarCondensed,
        setSidebarCollapsed,
        toggleSidebar,
        setMobileNavOpen,
        setGlobalSearchOpen,
        setTopbarCondensed,
        closeTransientUi,
      }}
    >
      {children}
    </AppShellContext.Provider>
  );
}

export function useAppShell() {
  const context = useContext(AppShellContext);

  if (!context) {
    throw new Error("useAppShell must be used within AppShellProvider.");
  }

  return context;
}
