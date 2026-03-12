"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { OfflineBanner } from "@/components/pwa/offline-banner";
import {
  OFFLINE_QUEUE_SNAPSHOT_MESSAGE,
  readOfflineQueueSnapshot,
  registerOfflineQueueBackgroundSync,
} from "@/lib/offline/background-sync";
import { useOfflineStore } from "@/stores/offline-store";
import type { OfflineQueueItem, OfflineSyncResponse } from "@/types/offline";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type OfflineRuntimeContextValue = {
  canInstall: boolean;
  isSyncing: boolean;
  promptInstall: () => Promise<void>;
  syncNow: () => Promise<void>;
};

export const OfflineRuntimeContext = createContext<OfflineRuntimeContextValue>({
  canInstall: false,
  isSyncing: false,
  promptInstall: async () => {},
  syncNow: async () => {},
});

type OfflineQueueSnapshotMessage = {
  lastSyncedAt: string | null;
  queue: OfflineQueueItem[];
  type: typeof OFFLINE_QUEUE_SNAPSHOT_MESSAGE;
};

async function parseErrorMessage(response: Response) {
  try {
    const payload = await response.json() as { message?: string };
    return payload.message ?? `Sync failed with status ${response.status}.`;
  } catch {
    return `Sync failed with status ${response.status}.`;
  }
}

async function invalidateByType(
  item: OfflineQueueItem,
  queryClient: ReturnType<typeof useQueryClient>,
) {
  if (item.type === "patients.create") {
    await queryClient.invalidateQueries({ queryKey: ["patients"] });
    return;
  }

  if (item.type === "appointments.create") {
    await queryClient.invalidateQueries({ queryKey: ["appointments"] });
    await queryClient.invalidateQueries({ queryKey: ["patients"] });
    return;
  }

  if (item.type === "bills.createDraft") {
    await queryClient.invalidateQueries({ queryKey: ["bills"] });
  }
}

export function OfflineRuntimeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const queryClient = useQueryClient();
  const hydrated = useOfflineStore((state) => state.hydrated);
  const isOnline = useOfflineStore((state) => state.isOnline);
  const queue = useOfflineStore((state) => state.queue);
  const markFailed = useOfflineStore((state) => state.markFailed);
  const markQueueItemStatus = useOfflineStore((state) =>
    state.markQueueItemStatus
  );
  const markSuccess = useOfflineStore((state) => state.markSuccess);
  const replaceQueue = useOfflineStore((state) => state.replaceQueue);
  const setLastSyncedAt = useOfflineStore((state) => state.setLastSyncedAt);
  const setOnline = useOfflineStore((state) => state.setOnline);
  const [canInstall, setCanInstall] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const syncLockRef = useRef(false);

  const syncNow = useCallback(async () => {
    if (syncLockRef.current || !hydrated || !isOnline) {
      return;
    }

    const items = useOfflineStore.getState().queue.filter((item) =>
      item.status === "PENDING" || item.status === "FAILED"
    );

    if (items.length === 0) {
      return;
    }

    syncLockRef.current = true;
    setIsSyncing(true);
    let anySuccess = false;

    try {
      for (const item of items) {
        markQueueItemStatus(item.id, "SYNCING");
      }

      const response = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            id: item.id,
            type: item.type,
            payload: item.payload,
          })),
        }),
        credentials: "same-origin",
      });

      if (!response.ok) {
        const message = await parseErrorMessage(response);
        for (const item of items) {
          markFailed(item.id, message);
        }
        return;
      }

      const payload = await response.json() as OfflineSyncResponse;

      for (const result of payload.results) {
        const item = items.find((entry) => entry.id === result.id);
        if (!item) {
          continue;
        }

        if (result.status === "COMPLETED") {
          markSuccess(item.id);
          await invalidateByType(item, queryClient);
          anySuccess = true;
          continue;
        }

        markFailed(item.id, result.message ?? "Sync failed offline.");
      }
    } finally {
      if (anySuccess) {
        setLastSyncedAt(new Date().toISOString());
        toast.success("Offline queue synced.");
      }

      setIsSyncing(false);
      syncLockRef.current = false;
    }
  }, [
    hydrated,
    isOnline,
    markFailed,
    markQueueItemStatus,
    markSuccess,
    queryClient,
    setLastSyncedAt,
  ]);

  const promptInstall = useCallback(async () => {
    if (!installPromptRef.current) {
      return;
    }

    await installPromptRef.current.prompt();
    await installPromptRef.current.userChoice;
    installPromptRef.current = null;
    setCanInstall(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    void readOfflineQueueSnapshot()
      .then((snapshot) => {
        if (!snapshot) {
          return;
        }

        replaceQueue(snapshot.queue);
        setLastSyncedAt(snapshot.lastSyncedAt);
      })
      .catch((error) => {
        console.error("Offline queue snapshot restore failed", error);
      });

    setOnline(window.navigator.onLine);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Service worker registration failed", error);
      });
    }

    function handleOnline() {
      setOnline(true);
    }

    function handleOffline() {
      setOnline(false);
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      installPromptRef.current = event as BeforeInstallPromptEvent;
      setCanInstall(true);
    }

    function handleWorkerMessage(event: MessageEvent<OfflineQueueSnapshotMessage>) {
      if (event.data?.type !== OFFLINE_QUEUE_SNAPSHOT_MESSAGE) {
        return;
      }

      replaceQueue(event.data.queue);
      setLastSyncedAt(event.data.lastSyncedAt);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleWorkerMessage);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener(
          "message",
          handleWorkerMessage,
        );
      }
    };
  }, [replaceQueue, setLastSyncedAt, setOnline]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    void registerOfflineQueueBackgroundSync(queue).catch((error) => {
      console.error("Offline queue background sync registration failed", error);
    });
  }, [hydrated, queue]);

  useEffect(() => {
    const actionableItems = queue.filter((item) =>
      item.status === "PENDING" || item.status === "FAILED"
    );

    if (!hydrated || !isOnline || actionableItems.length === 0) {
      return;
    }

    void syncNow();
  }, [hydrated, isOnline, queue, syncNow]);

  const contextValue = useMemo(
    () => ({
      canInstall,
      isSyncing,
      promptInstall,
      syncNow,
    }),
    [canInstall, isSyncing, promptInstall, syncNow],
  );

  return (
    <OfflineRuntimeContext.Provider value={contextValue}>
      <OfflineBanner />
      {children}
    </OfflineRuntimeContext.Provider>
  );
}
