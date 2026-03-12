import type { OfflineQueueItem } from "@/types/offline";

const DATABASE_NAME = "vhms-offline-sync";
const DATABASE_VERSION = 1;
const STORE_NAME = "runtime";
const SNAPSHOT_KEY = "queue-state";

export const OFFLINE_QUEUE_SYNC_TAG = "vhms-offline-queue-sync";
export const OFFLINE_QUEUE_SNAPSHOT_MESSAGE = "VHMS_OFFLINE_QUEUE_SNAPSHOT";

type BackgroundSyncServiceWorkerRegistration = ServiceWorkerRegistration & {
  sync: {
    register: (tag: string) => Promise<void>;
  };
};

export type OfflineQueueSnapshot = {
  key: typeof SNAPSHOT_KEY;
  lastSyncedAt: string | null;
  queue: OfflineQueueItem[];
  updatedAt: string;
};

function openOfflineRuntimeDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onerror = () => {
      reject(request.error ?? new Error("Unable to open offline runtime DB."));
    };

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore) => Promise<T>,
) {
  const database = await openOfflineRuntimeDb();

  try {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const result = await handler(store);

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(
          transaction.error ??
            new Error("Offline runtime transaction failed."),
        );
      transaction.onabort = () =>
        reject(
          transaction.error ??
            new Error("Offline runtime transaction aborted."),
        );
    });

    return result;
  } finally {
    database.close();
  }
}

export async function readOfflineQueueSnapshot(): Promise<
  OfflineQueueSnapshot | null
> {
  return withStore("readonly", async (store) =>
    new Promise<OfflineQueueSnapshot | null>((resolve, reject) => {
      const request = store.get(SNAPSHOT_KEY);

      request.onerror = () => {
        reject(
          request.error ?? new Error("Unable to read offline queue snapshot."),
        );
      };
      request.onsuccess = () => {
        resolve((request.result as OfflineQueueSnapshot | undefined) ?? null);
      };
    })
  );
}

export async function writeOfflineQueueSnapshot(input: {
  lastSyncedAt?: string | null;
  queue: OfflineQueueItem[];
}) {
  const existingSnapshot = await readOfflineQueueSnapshot();
  const snapshot: OfflineQueueSnapshot = {
    key: SNAPSHOT_KEY,
    lastSyncedAt: input.lastSyncedAt ?? existingSnapshot?.lastSyncedAt ?? null,
    queue: input.queue,
    updatedAt: new Date().toISOString(),
  };

  await withStore("readwrite", async (store) =>
    new Promise<void>((resolve, reject) => {
      const request = store.put(snapshot);

      request.onerror = () => {
        reject(
          request.error ?? new Error("Unable to persist offline queue snapshot."),
        );
      };
      request.onsuccess = () => {
        resolve();
      };
    })
  );
}

export async function registerOfflineQueueBackgroundSync(
  queue: OfflineQueueItem[],
) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  await writeOfflineQueueSnapshot({ queue });

  const actionableItems = queue.filter((item) =>
    item.status === "PENDING" || item.status === "FAILED"
  );

  const registration = await navigator.serviceWorker.ready;

  if (actionableItems.length === 0) {
    return;
  }

  if (
    "sync" in registration &&
    typeof (registration as Partial<BackgroundSyncServiceWorkerRegistration>).sync
      ?.register === "function"
  ) {
    try {
      await (registration as BackgroundSyncServiceWorkerRegistration).sync
        .register(OFFLINE_QUEUE_SYNC_TAG);
      return;
    } catch {
      // Fall through to a direct worker message on browsers with partial support.
    }
  }

  registration.active?.postMessage({
    type: "OFFLINE_QUEUE_FLUSH",
  });
}
