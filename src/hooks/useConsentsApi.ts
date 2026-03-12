"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import type {
  ConsentDocumentCreateInput,
  ConsentDocumentRecord,
  ConsentDocumentStatusUpdateInput,
  ConsentFilters,
  ConsentSignatureCreateInput,
  ConsentTemplateRecord,
  ConsentTemplateUpdateInput,
  ConsentTemplateUpsertInput,
  ConsentWorkspaceResponse,
} from "@/types/consent";

function buildConsentWorkspaceUrl(filters: ConsentFilters) {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.status && filters.status !== "ALL") {
    params.set("status", filters.status);
  }

  const query = params.toString();
  return query ? `/api/consents/templates?${query}` : "/api/consents/templates";
}

async function invalidateConsents(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await queryClient.invalidateQueries({ queryKey: ["consents"] });
}

export function useConsentWorkspace(filters: ConsentFilters = {}) {
  return useApiQuery<ConsentWorkspaceResponse>(
    ["consents", filters.q ?? "", filters.status ?? "ALL"],
    buildConsentWorkspaceUrl(filters),
  );
}

export function useCreateConsentTemplate() {
  const queryClient = useQueryClient();

  return useApiMutation<ConsentTemplateUpsertInput, ConsentTemplateRecord>(
    {
      method: "post",
      url: "/api/consents/templates",
    },
    {
      onSuccess: async () => {
        toast.success("Consent template created.");
        await invalidateConsents(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useUpdateConsentTemplate() {
  const queryClient = useQueryClient();

  return useApiMutation<ConsentTemplateUpdateInput, ConsentTemplateRecord>(
    {
      method: "patch",
      url: (input) => `/api/consents/templates/${input.id}`,
      transform: (input) => ({
        name: input.name,
        slug: input.slug,
        category: input.category,
        body: input.body,
        requiresWitness: input.requiresWitness,
        requiresDoctor: input.requiresDoctor,
        active: input.active,
      }),
    },
    {
      onSuccess: async () => {
        toast.success("Consent template updated.");
        await invalidateConsents(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useCreateConsentDocument() {
  const queryClient = useQueryClient();

  return useApiMutation<ConsentDocumentCreateInput, ConsentDocumentRecord>(
    {
      method: "post",
      url: "/api/consents/documents",
    },
    {
      onSuccess: async () => {
        toast.success("Consent document created.");
        await invalidateConsents(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useUpdateConsentDocumentStatus() {
  const queryClient = useQueryClient();

  return useApiMutation<
    ConsentDocumentStatusUpdateInput,
    ConsentDocumentRecord
  >(
    {
      method: "patch",
      url: (input) => `/api/consents/documents/${input.id}`,
      transform: (input) => ({
        action: input.action,
      }),
    },
    {
      onSuccess: async (_, input) => {
        toast.success(
          input.action === "REQUEST_SIGNATURE"
            ? "Consent moved to signature workflow."
            : input.action === "DECLINE"
            ? "Consent marked as declined."
            : "Consent revoked.",
        );
        await invalidateConsents(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}

export function useCreateConsentSignature() {
  const queryClient = useQueryClient();

  return useApiMutation<ConsentSignatureCreateInput, ConsentDocumentRecord>(
    {
      method: "post",
      url: (input) =>
        `/api/consents/documents/${input.consentDocumentId}/signatures`,
      transform: (input) => ({
        signerRole: input.signerRole,
        signerName: input.signerName,
        mode: input.mode,
        notes: input.notes,
      }),
    },
    {
      onSuccess: async () => {
        toast.success("Consent signature captured.");
        await invalidateConsents(queryClient);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
}
