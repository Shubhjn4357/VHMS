"use client";

import { useMutation } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { BarcodeLookupResponse } from "@/types/search";

export function useBarcodeLookup() {
  return useMutation<BarcodeLookupResponse, Error, string>({
    mutationFn: async (code) => {
      const response = await apiClient.get<BarcodeLookupResponse>(
        `/api/barcode?code=${encodeURIComponent(code)}`,
      );

      return response.data;
    },
  });
}
