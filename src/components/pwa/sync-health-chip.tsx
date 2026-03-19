"use client";

import {
  CheckCircle2,
  RefreshCcw,
  WifiOff,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
      <Badge className="status-pill-warning rounded-full border-transparent px-3 py-2 uppercase tracking-[0.16em]" variant="outline">
        {failedCount} failed
      </Badge>
    );
  }

  if (isSyncing) {
    return (
      <Badge className="status-pill-info rounded-full border-transparent px-3 py-2 uppercase tracking-[0.16em]" variant="outline">
        <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
        Syncing
      </Badge>
    );
  }

  if (pendingCount > 0) {
    return (
      <Badge className="status-pill-info rounded-full border-transparent px-3 py-2 uppercase tracking-[0.16em]" variant="outline">
        {pendingCount} queued
      </Badge>
    );
  }

  if (!isOnline) {
    return (
      <Badge className="status-pill-danger rounded-full border-transparent px-3 py-2 uppercase tracking-[0.16em]" variant="outline">
        <WifiOff className="h-3.5 w-3.5" />
        Waiting reconnect
      </Badge>
    );
  }

  return (
    <Badge className="status-pill-success rounded-full border-transparent px-3 py-2 uppercase tracking-[0.16em]" variant="outline">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Sync healthy
    </Badge>
  );
}
