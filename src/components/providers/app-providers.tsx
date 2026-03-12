"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";
import { Toaster } from "sonner";

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
            "glass-panel-strong rounded-[24px] border-0 p-4 text-sm shadow-[var(--shadow-card)]",
          title: "text-sm font-semibold text-foreground",
          description: "text-sm text-muted-foreground",
          actionButton:
            "rounded-xl bg-primary px-3 py-2 text-primary-foreground",
          cancelButton:
            "glass-chip rounded-xl px-3 py-2 text-foreground",
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
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          <OfflineRuntimeProvider>{children}</OfflineRuntimeProvider>
          <WebVitalsReporter />
          <ThemeAwareToaster />
        </QueryClientProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
