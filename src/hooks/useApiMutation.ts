"use client";

import { useMutation, type UseMutationOptions } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";

type MutationConfig<TInput> = {
  method?: "post" | "put" | "patch" | "delete";
  url: string | ((input: TInput) => string);
  transform?: (input: TInput) => unknown;
};

const inflightMutationRequests = new Map<string, Promise<unknown>>();

export function useApiMutation<TInput, TOutput>(
  config: MutationConfig<TInput>,
  options?: Omit<UseMutationOptions<TOutput, Error, TInput>, "mutationFn">,
) {
  return useMutation<TOutput, Error, TInput>({
    mutationFn: async (input) => {
      const method = config.method ?? "post";
      const url = typeof config.url === "function" ? config.url(input) : config.url;
      const data = config.transform ? config.transform(input) : input;
      const dedupeKey = `${method}:${url}:${JSON.stringify(data ?? null)}`;
      const existingRequest = inflightMutationRequests.get(dedupeKey);

      if (existingRequest) {
        return existingRequest as Promise<TOutput>;
      }

      const requestPromise = apiClient.request<TOutput>({
        method,
        url,
        data,
      }).then((response) => response.data).finally(() => {
        inflightMutationRequests.delete(dedupeKey);
      });

      inflightMutationRequests.set(dedupeKey, requestPromise);

      return requestPromise;
    },
    ...options,
  });
}
