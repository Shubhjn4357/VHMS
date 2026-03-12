"use client";

import type { OfflineDraftKey } from "@/types/offline";
import { useOfflineStore } from "@/stores/offline-store";

export function useOfflineQueue() {
  const hydrated = useOfflineStore((state) => state.hydrated);
  const isOnline = useOfflineStore((state) => state.isOnline);
  const lastSyncedAt = useOfflineStore((state) => state.lastSyncedAt);
  const queue = useOfflineStore((state) => state.queue);
  const drafts = useOfflineStore((state) => state.drafts);
  const clearCompletedHistory = useOfflineStore((state) =>
    state.clearCompletedHistory
  );
  const clearDraft = useOfflineStore((state) => state.clearDraft);
  const enqueueAction = useOfflineStore((state) => state.enqueueAction);
  const retryFailedActions = useOfflineStore((state) => state.retryFailedActions);
  const saveDraft = useOfflineStore((state) => state.saveDraft);

  return {
    clearCompletedHistory,
    clearDraft,
    completedCount: queue.filter((item) => item.status === "COMPLETED").length,
    draftCount: Object.keys(drafts).length,
    drafts,
    enqueueAction,
    failedCount: queue.filter((item) => item.status === "FAILED").length,
    hydrated,
    isOnline,
    lastSyncedAt,
    pendingCount:
      queue.filter((item) =>
        item.status === "PENDING" || item.status === "SYNCING"
      ).length,
    queue,
    retryFailedActions,
    saveDraft,
  };
}

export function useOfflineDraft<TPayload>(key: OfflineDraftKey) {
  const draft = useOfflineStore((state) => state.drafts[key]) as {
    key: OfflineDraftKey;
    label: string;
    payload: TPayload;
    updatedAt: string;
  } | undefined;
  const clearDraft = useOfflineStore((state) => state.clearDraft);
  const saveDraft = useOfflineStore((state) => state.saveDraft);

  return {
    clearDraft: () => clearDraft(key),
    draft,
    saveDraft: (label: string, payload: TPayload) =>
      saveDraft({
        key,
        label,
        payload,
      }),
  };
}
