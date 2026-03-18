"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";
import { Toaster } from "sonner";

import { AppShellProvider } from "@/components/providers/app-shell-provider";
import { OfflineRuntimeProvider } from "@/components/providers/offline-runtime-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { WebVitalsReporter } from "@/components/providers/web-vitals-reporter";

function ThemeAwareToaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      position="top-right"
      richColors
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      toastOptions={{
        classNames: {
          toast:
            "glass-panel-strong rounded-[var(--radius-panel)] border-0 p-4 text-sm shadow-[var(--shadow-card)]",
          title: "text-sm font-semibold tracking-tight text-foreground",
          description: "text-sm leading-6 text-muted-foreground",
          actionButton:
            "rounded-[var(--radius-control)] bg-primary px-3 py-2 text-primary-foreground shadow-[var(--shadow-button)]",
          cancelButton:
            "glass-chip rounded-[var(--radius-control)] px-3 py-2 text-foreground",
        },
      }}
    />
  );
}

export function AppProviders({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 10 * 60_000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: 1,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      <AppShellProvider>
        <SessionProvider>
          <QueryClientProvider client={queryClient}>
            <OfflineRuntimeProvider>{children}</OfflineRuntimeProvider>
            <WebVitalsReporter />
            <ThemeAwareToaster />
          </QueryClientProvider>
        </SessionProvider>
      </AppShellProvider>
    </ThemeProvider>
  );
}
