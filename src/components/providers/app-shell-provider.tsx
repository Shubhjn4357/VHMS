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
  isDesktop: boolean;
  isSidebarCollapsed: boolean;
  isMobileNavOpen: boolean;
  isGlobalSearchOpen: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  setMobileNavOpen: (open: boolean) => void;
  setGlobalSearchOpen: (open: boolean) => void;
  closeTransientUi: () => void;
};

const AppShellContext = createContext<AppShellContextValue | null>(null);
const SIDEBAR_PREF_EVENT = "app-shell:sidebar-collapsed";
const DESKTOP_MEDIA_QUERY = `(min-width: ${APP_THEME.layout.desktopBreakpoint}px)`;

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

function getDesktopSnapshot() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

function subscribeToDesktopViewport(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const mediaQueryList = window.matchMedia(DESKTOP_MEDIA_QUERY);
  const handleChange = () => {
    callback();
  };

  mediaQueryList.addEventListener("change", handleChange);

  return () => {
    mediaQueryList.removeEventListener("change", handleChange);
  };
}

export function AppShellProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDesktop = useSyncExternalStore(
    subscribeToDesktopViewport,
    getDesktopSnapshot,
    () => false,
  );
  const isSidebarCollapsed = useSyncExternalStore(
    subscribeToSidebarCollapsed,
    getSidebarCollapsedSnapshot,
    () => false,
  );
  const [isMobileNavOpen, setMobileNavOpenState] = useState(false);
  const [isGlobalSearchOpen, setGlobalSearchOpen] = useState(false);

  function setSidebarCollapsed(collapsed: boolean) {
    if (!isDesktop) {
      return;
    }

    startTransition(() => {
      updateSidebarCollapsedPreference(collapsed);
    });
  }

  function toggleSidebar() {
    if (!isDesktop) {
      setMobileNavOpenState((current) => !current);
      return;
    }

    startTransition(() => {
      updateSidebarCollapsedPreference(!isSidebarCollapsed);
    });
  }

  function openMobileNav() {
    if (!isDesktop) {
      setMobileNavOpenState(true);
    }
  }

  function closeMobileNav() {
    setMobileNavOpenState(false);
  }

  function setMobileNavOpen(open: boolean) {
    setMobileNavOpenState(open);
  }

  function closeTransientUi() {
    setMobileNavOpenState(false);
    setGlobalSearchOpen(false);
  }

  return (
    <AppShellContext.Provider
      value={{
        isDesktop,
        isSidebarCollapsed,
        isMobileNavOpen,
        isGlobalSearchOpen,
        setSidebarCollapsed,
        toggleSidebar,
        openMobileNav,
        closeMobileNav,
        setMobileNavOpen,
        setGlobalSearchOpen,
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
