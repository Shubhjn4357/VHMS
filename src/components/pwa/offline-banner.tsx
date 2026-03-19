"use client";

import {
  ArrowUpCircle,
  CheckCircle2,
  Download,
  RefreshCcw,
  Wifi,
  WifiOff,
  X,
  XCircle,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
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
  const [hideBanner, setHideBanner] = useState(false);
  if (!hydrated) {
    return null;
  }

  const hasStatus = !isOnline || pendingCount > 0 || failedCount > 0 ||
    draftCount > 0 || canInstall || isSyncing || completedCount > 0;

  const shouldRender = hasStatus && !hideBanner;

  if (!shouldRender) {
    return null;
  }

  return (
    <div className="sticky top-0 z-70 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 text-sm sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <Badge
            className={`${isOnline ? "status-pill-success" : "status-pill-danger"} rounded-full border-transparent px-3 py-2`}
            variant="outline"
          >
            {isOnline ? <Wifi className="h-4 w-4 text-success" /> : <WifiOff className="h-4 w-4 text-danger" />}
            {isOnline ? "Online" : "Offline mode"}
          </Badge>
          <Badge className="status-pill-info rounded-full border-transparent px-3 py-2" variant="outline">
            <ArrowUpCircle className="h-4 w-4 text-brand" />
            {pendingCount} queued
          </Badge>
          <Badge className="status-pill-warning rounded-full border-transparent px-3 py-2" variant="outline">
            <XCircle className="h-4 w-4 text-warning" />
            {failedCount} failed
          </Badge>
          <Badge className="status-pill-secondary rounded-full border-transparent px-3 py-2" variant="outline">
            <CheckCircle2 className="h-4 w-4 text-accent" />
            {draftCount} drafts
          </Badge>
          {completedCount > 0
            ? (
              <Badge className="status-pill-success rounded-full border-transparent px-3 py-2" variant="outline">
                <CheckCircle2 className="h-4 w-4 text-success" />
                {completedCount} synced
              </Badge>
            )
            : null}
          <span className="text-muted-foreground">
            Last sync: {formatTimestamp(lastSyncedAt)}
          </span>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
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
          <Button
            onClick={() => setHideBanner(true)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
