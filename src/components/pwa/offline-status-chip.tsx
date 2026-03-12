"use client";

import { ArrowUpCircle, Wifi, WifiOff, XCircle } from "lucide-react";

import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";

export function OfflineStatusChip() {
  const { hydrated, isOnline, pendingCount, failedCount } = useOfflineQueue();
  const { isSyncing } = usePwaInstallPrompt();

  if (!hydrated) {
    return null;
  }

  return (
    <span className="glass-chip inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink">
      {isOnline
        ? <Wifi className="h-3.5 w-3.5 text-success" />
        : <WifiOff className="h-3.5 w-3.5 text-danger" />}
      {isOnline ? "Online" : "Offline"}
      {pendingCount > 0
        ? (
          <>
            <ArrowUpCircle className={`h-3.5 w-3.5 text-brand ${isSyncing ? "animate-pulse" : ""}`} />
            {pendingCount}
          </>
        )
        : null}
      {failedCount > 0
        ? (
          <>
            <XCircle className="h-3.5 w-3.5 text-warning" />
            {failedCount}
          </>
        )
        : null}
    </span>
  );
}
