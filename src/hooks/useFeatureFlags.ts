"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import type {
  FeatureFlagRecord,
  FeatureFlagsWorkspaceResponse,
  FeatureFlagUpdateInput,
} from "@/types/featureFlags";

export function useFeatureFlags() {
  return useApiQuery<FeatureFlagsWorkspaceResponse>(
    ["feature-flags"],
    "/api/feature-flags",
  );
}

export function useUpdateFeatureFlag() {
  const queryClient = useQueryClient();

  return useApiMutation<FeatureFlagUpdateInput, FeatureFlagRecord>(
    {
      method: "patch",
      url: "/api/feature-flags",
    },
    {
      onSuccess: async (_, input) => {
        toast.success(`${input.key} updated.`);
        await queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
      },
      onError: (error) => toast.error(error.message),
    },
  );
}
