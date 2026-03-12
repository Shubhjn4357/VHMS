"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";

export function useApiQuery<TData>(
  queryKey: readonly unknown[],
  url: string,
  options?: Omit<UseQueryOptions<TData>, "queryKey" | "queryFn">,
) {
  return useQuery<TData>({
    queryKey,
    queryFn: async () => {
      const response = await apiClient.get<TData>(url);
      return response.data;
    },
    ...options,
  });
}
