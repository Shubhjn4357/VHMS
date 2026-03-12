"use client";

import { usePathname } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";

export function DashboardLayoutFrame({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  if (pathname.startsWith("/dashboard/print/")) {
    return <>{children}</>;
  }

  return <DashboardShell>{children}</DashboardShell>;
}
