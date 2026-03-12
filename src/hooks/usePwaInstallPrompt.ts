"use client";

import { useContext } from "react";

import { OfflineRuntimeContext } from "@/components/providers/offline-runtime-provider";

export function usePwaInstallPrompt() {
  return useContext(OfflineRuntimeContext);
}
