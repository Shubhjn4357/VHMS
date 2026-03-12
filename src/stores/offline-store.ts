"use client";

import { nanoid } from "nanoid";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type {
  OfflineActionPayloadMap,
  OfflineActionStatus,
  OfflineActionType,
  OfflineDraftKey,
  OfflineDraftRecord,
  OfflineLookupKey,
  OfflineLookupMap,
  OfflineQueueItem,
} from "@/types/offline";

type OfflineLookupCache = {
  [Key in keyof OfflineLookupMap]: OfflineLookupMap[Key];
};

type OfflineStore = {
  drafts: Partial<Record<OfflineDraftKey, OfflineDraftRecord>>;
  hydrated: boolean;
  isOnline: boolean;
  lastSyncedAt: string | null;
  lookupCache: OfflineLookupCache;
  lookupCacheUpdatedAt: Partial<Record<OfflineLookupKey, string>>;
  queue: OfflineQueueItem[];
  clearCompletedHistory: () => void;
  clearDraft: (key: OfflineDraftKey) => void;
  enqueueAction: <TType extends OfflineActionType>(input: {
    label: string;
    method?: "POST";
    payload: OfflineActionPayloadMap[TType];
    type: TType;
    url: string;
  }) => string;
  markFailed: (id: string, error: string) => void;
  markQueueItemStatus: (id: string, status: OfflineActionStatus) => void;
  markSuccess: (id: string) => void;
  retryFailedActions: () => void;
  replaceQueue: (queue: OfflineQueueItem[]) => void;
  saveDraft: <TPayload>(input: {
    key: OfflineDraftKey;
    label: string;
    payload: TPayload;
  }) => void;
  setLookupEntries: <TKey extends OfflineLookupKey>(
    key: TKey,
    entries: OfflineLookupMap[TKey],
  ) => void;
  setHydrated: (value: boolean) => void;
  setLastSyncedAt: (value: string | null) => void;
  setOnline: (value: boolean) => void;
};

const STORAGE_KEY = "vhms-offline-runtime-v1";

function buildQueueItem<TType extends OfflineActionType>(input: {
  label: string;
  method?: "POST";
  payload: OfflineActionPayloadMap[TType];
  type: TType;
  url: string;
}): OfflineQueueItem {
  const timestamp = new Date().toISOString();

  return {
    id: nanoid(),
    type: input.type,
    label: input.label,
    url: input.url,
    method: input.method ?? "POST",
    payload: input.payload,
    status: "PENDING",
    createdAt: timestamp,
    updatedAt: timestamp,
    retryCount: 0,
    lastError: null,
  };
}

export const useOfflineStore = create<OfflineStore>()(
  persist(
    (set) => ({
      drafts: {},
      hydrated: false,
      isOnline: true,
      lastSyncedAt: null,
      lookupCache: {
        patients: [],
        doctors: [],
        appointments: [],
        charges: [],
      },
      lookupCacheUpdatedAt: {},
      queue: [],
      clearCompletedHistory: () =>
        set((state) => ({
          queue: state.queue.filter((item) => item.status !== "COMPLETED"),
        })),
      clearDraft: (key) =>
        set((state) => {
          const nextDrafts = { ...state.drafts };
          delete nextDrafts[key];
          return {
            drafts: nextDrafts,
          };
        }),
      enqueueAction: (input) => {
        const item = buildQueueItem(input);

        set((state) => ({
          queue: [...state.queue, item],
        }));

        return item.id;
      },
      markFailed: (id, error) =>
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === id
              ? {
                ...item,
                status: "FAILED",
                updatedAt: new Date().toISOString(),
                retryCount: item.retryCount + 1,
                lastError: error,
              }
              : item
          ),
        })),
      markQueueItemStatus: (id, status) =>
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === id
              ? {
                ...item,
                status,
                updatedAt: new Date().toISOString(),
                lastError: status === "SYNCING" ? null : item.lastError,
              }
              : item
          ),
        })),
      markSuccess: (id) =>
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === id
              ? {
                ...item,
                status: "COMPLETED",
                updatedAt: new Date().toISOString(),
                lastError: null,
              }
              : item
          ),
        })),
      retryFailedActions: () =>
        set((state) => ({
          queue: state.queue.map((item) =>
            item.status === "FAILED"
              ? {
                ...item,
                status: "PENDING",
                updatedAt: new Date().toISOString(),
                lastError: null,
              }
              : item
          ),
        })),
      replaceQueue: (queue) => set({ queue }),
      saveDraft: (input) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [input.key]: {
              key: input.key,
              label: input.label,
              payload: input.payload,
              updatedAt: new Date().toISOString(),
            },
          },
        })),
      setLookupEntries: (key, entries) =>
        set((state) => ({
          lookupCache: {
            ...state.lookupCache,
            [key]: entries,
          },
          lookupCacheUpdatedAt: {
            ...state.lookupCacheUpdatedAt,
            [key]: new Date().toISOString(),
          },
        })),
      setHydrated: (value) => set({ hydrated: value }),
      setLastSyncedAt: (value) => set({ lastSyncedAt: value }),
      setOnline: (value) => set({ isOnline: value }),
    }),
    {
      name: STORAGE_KEY,
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
      partialize: (state) => ({
        drafts: state.drafts,
        lastSyncedAt: state.lastSyncedAt,
        lookupCache: state.lookupCache,
        lookupCacheUpdatedAt: state.lookupCacheUpdatedAt,
        queue: state.queue,
      }),
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
