"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import type {
  AnnouncementPostRecord,
  AnnouncementUpsertInput,
  CommunicationFilters,
  CommunicationLogRecord,
  CommunicationSendInput,
  CommunicationTemplateRecord,
  CommunicationTemplateUpdateInput,
  CommunicationTemplateUpsertInput,
  CommunicationWorkspaceResponse,
  MessageQueueActionInput,
  MessageQueueRecord,
  NotificationItemRecord,
  NotificationUpdateInput,
} from "@/types/communication";

function buildCommunicationsUrl(filters: CommunicationFilters) {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.status && filters.status !== "ALL") {
    params.set("status", filters.status);
  }

  const query = params.toString();
  return query ? `/api/communications?${query}` : "/api/communications";
}

async function invalidateCommunications(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await queryClient.invalidateQueries({ queryKey: ["communications"] });
}

export function useCommunicationWorkspace(filters: CommunicationFilters = {}) {
  return useApiQuery<CommunicationWorkspaceResponse>(
    ["communications", filters.q ?? "", filters.status ?? "ALL"],
    buildCommunicationsUrl(filters),
  );
}

export function useCreateCommunicationTemplate() {
  const queryClient = useQueryClient();

  return useApiMutation<
    CommunicationTemplateUpsertInput,
    CommunicationTemplateRecord
  >(
    {
      method: "post",
      url: "/api/communications/templates",
    },
    {
      onSuccess: async () => {
        toast.success("Communication template created.");
        await invalidateCommunications(queryClient);
      },
      onError: (error) => toast.error(error.message),
    },
  );
}

export function useUpdateCommunicationTemplate() {
  const queryClient = useQueryClient();

  return useApiMutation<
    CommunicationTemplateUpdateInput,
    CommunicationTemplateRecord
  >(
    {
      method: "patch",
      url: (input) => `/api/communications/templates/${input.id}`,
      transform: (input) => ({
        key: input.key,
        channel: input.channel,
        title: input.title,
        body: input.body,
        active: input.active,
      }),
    },
    {
      onSuccess: async () => {
        toast.success("Communication template updated.");
        await invalidateCommunications(queryClient);
      },
      onError: (error) => toast.error(error.message),
    },
  );
}

export function useSendCommunication() {
  const queryClient = useQueryClient();

  return useApiMutation<CommunicationSendInput, CommunicationLogRecord>(
    {
      method: "post",
      url: "/api/communications/send",
    },
    {
      onSuccess: async () => {
        toast.success("Communication queued.");
        await invalidateCommunications(queryClient);
      },
      onError: (error) => toast.error(error.message),
    },
  );
}

export function useUpdateQueueItem() {
  const queryClient = useQueryClient();

  return useApiMutation<MessageQueueActionInput, MessageQueueRecord>(
    {
      method: "patch",
      url: (input) => `/api/communications/queue/${input.id}`,
      transform: (input) => ({
        action: input.action,
        errorMessage: input.errorMessage,
      }),
    },
    {
      onSuccess: async (_, input) => {
        toast.success(
          input.action === "MARK_FAILED"
            ? "Queue item marked failed."
            : input.action === "REQUEUE"
            ? "Queue item requeued."
            : "Queue state updated.",
        );
        await invalidateCommunications(queryClient);
      },
      onError: (error) => toast.error(error.message),
    },
  );
}

export function useUpdateNotificationItem() {
  const queryClient = useQueryClient();

  return useApiMutation<NotificationUpdateInput, NotificationItemRecord>(
    {
      method: "patch",
      url: (input) => `/api/communications/notifications/${input.id}`,
      transform: (input) => ({
        action: input.action,
      }),
    },
    {
      onSuccess: async (_, input) => {
        toast.success(
          input.action === "ACKNOWLEDGE"
            ? "Notification acknowledged."
            : "Notification marked read.",
        );
        await invalidateCommunications(queryClient);
      },
      onError: (error) => toast.error(error.message),
    },
  );
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useApiMutation<AnnouncementUpsertInput, AnnouncementPostRecord>(
    {
      method: "post",
      url: "/api/communications/announcements",
    },
    {
      onSuccess: async () => {
        toast.success("Announcement created.");
        await invalidateCommunications(queryClient);
      },
      onError: (error) => toast.error(error.message),
    },
  );
}
