"use client";

import {
  CheckCircle2,
  RefreshCcw,
  WifiOff,
} from "lucide-react";

import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";

export function SyncHealthChip() {
  const { failedCount, hydrated, isOnline, pendingCount } = useOfflineQueue();
  const { isSyncing } = usePwaInstallPrompt();

  if (!hydrated) {
    return null;
  }

  if (failedCount > 0) {
    return (
      <span className="glass-chip rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-warning">
        {failedCount} failed
      </span>
    );
  }

  if (isSyncing) {
    return (
      <span className="glass-chip inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
        <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
        Syncing
      </span>
    );
  }

  if (pendingCount > 0) {
    return (
      <span className="glass-chip rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
        {pendingCount} queued
      </span>
    );
  }

  if (!isOnline) {
    return (
      <span className="glass-chip inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-danger">
        <WifiOff className="h-3.5 w-3.5" />
        Waiting reconnect
      </span>
    );
  }

  return (
    <span className="glass-chip inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-success">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Sync healthy
    </span>
  );
}
