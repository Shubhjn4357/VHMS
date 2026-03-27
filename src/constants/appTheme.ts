export const APP_THEME = {
  storageKeys: {
    sidebarCollapsed: "vhms.sidebar.collapsed",
  },
  layout: {
    shellMaxWidth: 1720,
    desktopBreakpoint: 1024,
    sidebarExpandedWidth: 288,
    sidebarCollapsedWidth: 84,
    topbarCondenseOffset: 26,
    drawerMaxWidth: 1180,
  },
  motion: {
    pageEnterOffset: 18,
    pageEnterDuration: 0.28,
    pageExitDuration: 0.18,
  },
} as const;

export const THEME_MODE_ORDER = ["light", "dark", "system"] as const;

export type ThemeMode = (typeof THEME_MODE_ORDER)[number];
