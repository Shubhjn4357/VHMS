const CACHE_NAME = "vhms-shell-v4";
const STATIC_ASSETS = ["/offline", "/icon.svg", "/manifest.webmanifest"];

const OFFLINE_DB_NAME = "vhms-offline-sync";
const OFFLINE_DB_VERSION = 1;
const OFFLINE_STORE_NAME = "runtime";
const OFFLINE_SNAPSHOT_KEY = "queue-state";
const OFFLINE_SYNC_TAG = "vhms-offline-queue-sync";
const OFFLINE_QUEUE_SNAPSHOT_MESSAGE = "VHMS_OFFLINE_QUEUE_SNAPSHOT";

function openOfflineDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);

    request.onerror = () => {
      reject(request.error || new Error("Unable to open offline sync DB."));
    };

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(OFFLINE_STORE_NAME)) {
        database.createObjectStore(OFFLINE_STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

async function withOfflineStore(mode, handler) {
  const database = await openOfflineDb();

  try {
    const transaction = database.transaction(OFFLINE_STORE_NAME, mode);
    const store = transaction.objectStore(OFFLINE_STORE_NAME);
    const result = await handler(store);

    await new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error || new Error("Offline sync transaction failed."));
      transaction.onabort = () =>
        reject(transaction.error || new Error("Offline sync transaction aborted."));
    });

    return result;
  } finally {
    database.close();
  }
}

async function readOfflineQueueSnapshot() {
  return withOfflineStore("readonly", (store) =>
    new Promise((resolve, reject) => {
      const request = store.get(OFFLINE_SNAPSHOT_KEY);

      request.onerror = () => {
        reject(
          request.error || new Error("Unable to read offline queue snapshot."),
        );
      };
      request.onsuccess = () => {
        resolve(
          request.result || {
            key: OFFLINE_SNAPSHOT_KEY,
            lastSyncedAt: null,
            queue: [],
            updatedAt: new Date().toISOString(),
          },
        );
      };
    })
  );
}

async function writeOfflineQueueSnapshot(snapshot) {
  const nextSnapshot = {
    key: OFFLINE_SNAPSHOT_KEY,
    lastSyncedAt: snapshot.lastSyncedAt ?? null,
    queue: Array.isArray(snapshot.queue) ? snapshot.queue : [],
    updatedAt: snapshot.updatedAt || new Date().toISOString(),
  };

  await withOfflineStore("readwrite", (store) =>
    new Promise((resolve, reject) => {
      const request = store.put(nextSnapshot);

      request.onerror = () => {
        reject(
          request.error || new Error("Unable to persist offline queue snapshot."),
        );
      };
      request.onsuccess = () => {
        resolve();
      };
    })
  );

  return nextSnapshot;
}

async function broadcastOfflineQueueSnapshot(snapshot) {
  const clients = await self.clients.matchAll({
    includeUncontrolled: true,
    type: "window",
  });

  await Promise.all(
    clients.map((client) =>
      client.postMessage({
        type: OFFLINE_QUEUE_SNAPSHOT_MESSAGE,
        queue: snapshot.queue,
        lastSyncedAt: snapshot.lastSyncedAt,
      })
    ),
  );
}

async function parseErrorMessage(response) {
  try {
    const payload = await response.json();
    return payload.message || `Sync failed with status ${response.status}.`;
  } catch {
    return `Sync failed with status ${response.status}.`;
  }
}

async function replayOfflineQueue() {
  const snapshot = await readOfflineQueueSnapshot();
  const queue = Array.isArray(snapshot.queue) ? [...snapshot.queue] : [];
  const actionableItems = queue.filter((item) =>
    item.status === "PENDING" || item.status === "FAILED"
  );

  if (actionableItems.length === 0) {
    await broadcastOfflineQueueSnapshot(snapshot);
    return;
  }

  let anySuccess = false;

  for (const item of actionableItems) {
    const itemIndex = queue.findIndex((entry) => entry.id === item.id);
    if (itemIndex < 0) {
      continue;
    }

    queue[itemIndex] = {
      ...queue[itemIndex],
      status: "SYNCING",
      updatedAt: new Date().toISOString(),
      lastError: null,
    };
  }

  await writeOfflineQueueSnapshot({
    ...snapshot,
    queue,
  });

  try {
    const response = await fetch("/api/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: actionableItems.map((item) => ({
          id: item.id,
          type: item.type,
          payload: item.payload,
        })),
      }),
      credentials: "include",
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);

      for (const item of actionableItems) {
        const itemIndex = queue.findIndex((entry) => entry.id === item.id);
        if (itemIndex < 0) {
          continue;
        }

        queue[itemIndex] = {
          ...queue[itemIndex],
          status: "FAILED",
          updatedAt: new Date().toISOString(),
          retryCount: Number(queue[itemIndex].retryCount || 0) + 1,
          lastError: message,
        };
      }
    } else {
      const payload = await response.json();

      for (const result of payload.results || []) {
        const itemIndex = queue.findIndex((entry) => entry.id === result.id);
        if (itemIndex < 0) {
          continue;
        }

        if (result.status === "COMPLETED") {
          queue[itemIndex] = {
            ...queue[itemIndex],
            status: "COMPLETED",
            updatedAt: new Date().toISOString(),
            lastError: null,
          };
          anySuccess = true;
          continue;
        }

        queue[itemIndex] = {
          ...queue[itemIndex],
          status: "FAILED",
          updatedAt: new Date().toISOString(),
          retryCount: Number(queue[itemIndex].retryCount || 0) + 1,
          lastError: result.message || "Sync failed offline.",
        };
      }
    }
  } catch (error) {
    for (const item of actionableItems) {
      const itemIndex = queue.findIndex((entry) => entry.id === item.id);
      if (itemIndex < 0) {
        continue;
      }

      queue[itemIndex] = {
        ...queue[itemIndex],
        status: "FAILED",
        updatedAt: new Date().toISOString(),
        retryCount: Number(queue[itemIndex].retryCount || 0) + 1,
        lastError:
          error instanceof Error ? error.message : "Sync failed offline.",
      };
    }
  }

  const nextSnapshot = await writeOfflineQueueSnapshot({
    ...snapshot,
    lastSyncedAt: anySuccess ? new Date().toISOString() : snapshot.lastSyncedAt,
    queue,
  });

  await broadcastOfflineQueueSnapshot(nextSnapshot);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(
      () => self.skipWaiting(),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      )
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  const payload = event.data;

  if (!payload || typeof payload !== "object") {
    return;
  }

  if (payload.type === "OFFLINE_QUEUE_FLUSH") {
    event.waitUntil(replayOfflineQueue());
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag !== OFFLINE_SYNC_TAG) {
    return;
  }

  event.waitUntil(replayOfflineQueue());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    return;
  }

  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "image" ||
    request.destination === "font"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }

        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }

          return response;
        });
      }),
    );
  }
});
