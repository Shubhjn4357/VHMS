export const APP_THEME = {
  storageKeys: {
    sidebarCollapsed: "vhms.sidebar.collapsed",
  },
  layout: {
    shellMaxWidth: 1600,
    desktopBreakpoint: 1024,
    sidebarExpandedWidth: 304,
    sidebarCollapsedWidth: 92,
    topbarCondenseOffset: 20,
    drawerMaxWidth: 1120,
  },
  motion: {
    pageEnterOffset: 18,
    pageEnterDuration: 0.28,
    pageExitDuration: 0.18,
  },
} as const;

export const THEME_MODE_ORDER = ["light", "dark", "system"] as const;

export type ThemeMode = (typeof THEME_MODE_ORDER)[number];
