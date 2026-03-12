"use client";

import { useApiQuery } from "@/hooks/useApiQuery";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import type { GlobalSearchResponse } from "@/types/search";

function buildSearchUrl(query: string) {
  return `/api/search?q=${encodeURIComponent(query)}`;
}

export function useGlobalSearch(query: string) {
  const deferredQuery = useDebouncedSearch(query);

  return useApiQuery<GlobalSearchResponse>(
    ["global-search", deferredQuery],
    buildSearchUrl(deferredQuery),
    {
      enabled: deferredQuery.length >= 2,
    },
  );
}
