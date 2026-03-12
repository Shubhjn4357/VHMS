"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { PrintTemplateKey } from "@/constants/printConfig";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import type {
  PrintTemplateRecord,
  PrintTemplateUpdateInput,
  PrintTemplateWorkspaceResponse,
} from "@/types/printTemplates";

function getTemplateUrl(templateKey: PrintTemplateKey) {
  return `/api/print-templates?templateKey=${encodeURIComponent(templateKey)}`;
}

export function usePrintTemplates() {
  return useApiQuery<PrintTemplateWorkspaceResponse>(
    ["print-templates"],
    "/api/print-templates",
  );
}

export function useUpdatePrintTemplate() {
  const queryClient = useQueryClient();

  return useApiMutation<PrintTemplateUpdateInput, PrintTemplateRecord>(
    {
      method: "patch",
      url: "/api/print-templates",
    },
    {
      onSuccess: async (_, input) => {
        toast.success("Print template saved.");
        await queryClient.invalidateQueries({ queryKey: ["print-templates"] });
        await queryClient.invalidateQueries({
          queryKey: ["print-template", input.templateKey],
        });
      },
      onError: (error) => toast.error(error.message),
    },
  );
}

export function useResetPrintTemplate() {
  const queryClient = useQueryClient();

  return useApiMutation<{ templateKey: PrintTemplateKey }, PrintTemplateRecord>(
    {
      method: "delete",
      url: (input) => getTemplateUrl(input.templateKey),
    },
    {
      onSuccess: async (_, input) => {
        toast.success("Print template reset.");
        await queryClient.invalidateQueries({ queryKey: ["print-templates"] });
        await queryClient.invalidateQueries({
          queryKey: ["print-template", input.templateKey],
        });
      },
      onError: (error) => toast.error(error.message),
    },
  );
}
