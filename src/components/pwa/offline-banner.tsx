"use client";

import {
  ArrowUpCircle,
  CheckCircle2,
  Download,
  RefreshCcw,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "No successful sync yet";
  }

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OfflineBanner() {
  const {
    clearCompletedHistory,
    completedCount,
    draftCount,
    failedCount,
    hydrated,
    isOnline,
    lastSyncedAt,
    pendingCount,
    retryFailedActions,
  } = useOfflineQueue();
  const { canInstall, isSyncing, promptInstall, syncNow } = usePwaInstallPrompt();

  if (!hydrated) {
    return null;
  }

  const shouldRender = !isOnline || pendingCount > 0 || failedCount > 0 ||
    draftCount > 0 || canInstall || isSyncing || completedCount > 0;

  if (!shouldRender) {
    return null;
  }

  return (
    <div className="glass-panel sticky top-0 z-[70] border-b border-line/60">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 text-sm sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="glass-chip inline-flex items-center gap-2 rounded-full px-3 py-2 font-semibold text-ink">
            {isOnline ? <Wifi className="h-4 w-4 text-success" /> : <WifiOff className="h-4 w-4 text-danger" />}
            {isOnline ? "Online" : "Offline mode"}
          </span>
          <span className="glass-chip inline-flex items-center gap-2 rounded-full px-3 py-2 text-ink-soft">
            <ArrowUpCircle className="h-4 w-4 text-brand" />
            {pendingCount} queued
          </span>
          <span className="glass-chip inline-flex items-center gap-2 rounded-full px-3 py-2 text-ink-soft">
            <XCircle className="h-4 w-4 text-warning" />
            {failedCount} failed
          </span>
          <span className="glass-chip inline-flex items-center gap-2 rounded-full px-3 py-2 text-ink-soft">
            <CheckCircle2 className="h-4 w-4 text-accent" />
            {draftCount} drafts
          </span>
          {completedCount > 0
            ? (
              <span className="glass-chip inline-flex items-center gap-2 rounded-full px-3 py-2 text-ink-soft">
                <CheckCircle2 className="h-4 w-4 text-success" />
                {completedCount} synced
              </span>
            )
            : null}
          <span className="text-ink-soft">
            Last sync: {formatTimestamp(lastSyncedAt)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {failedCount > 0
            ? (
              <Button
                onClick={retryFailedActions}
                size="sm"
                type="button"
                variant="outline"
              >
                <RefreshCcw className="h-4 w-4" />
                Retry failed
              </Button>
            )
            : null}
          {isOnline && (pendingCount > 0 || isSyncing)
            ? (
              <Button
                disabled={isSyncing}
                onClick={() => void syncNow()}
                size="sm"
                type="button"
                variant="outline"
              >
                <RefreshCcw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing" : "Sync now"}
              </Button>
            )
            : null}
          {canInstall
            ? (
              <Button
                onClick={() => void promptInstall()}
                size="sm"
                type="button"
              >
                <Download className="h-4 w-4" />
                Install app
              </Button>
            )
            : null}
          {completedCount > 0
            ? (
              <Button
                onClick={clearCompletedHistory}
                size="sm"
                type="button"
                variant="outline"
              >
                Clear synced history
              </Button>
            )
            : null}
        </div>
      </div>
    </div>
  );
}
