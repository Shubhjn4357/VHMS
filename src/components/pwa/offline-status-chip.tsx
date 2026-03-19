"use client";

import { ArrowUpCircle, Wifi, WifiOff, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";

export function OfflineStatusChip() {
  const { hydrated, isOnline, pendingCount, failedCount } = useOfflineQueue();
  const { isSyncing } = usePwaInstallPrompt();

  if (!hydrated) {
    return null;
  }

  return (
    <Badge
      className={`${isOnline ? "status-pill-success" : "status-pill-danger"} rounded-full border-transparent px-3 py-2 uppercase tracking-[0.16em]`}
      variant="outline"
    >
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
    </Badge>
  );
}
