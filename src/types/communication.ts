import type { AnnouncementStatus } from "@/constants/announcementStatus";
import type { AnnouncementTargetType } from "@/constants/announcementTargetType";
import type { CommunicationChannel } from "@/constants/communicationChannel";
import type { CommunicationStatus } from "@/constants/communicationStatus";
import type { NotificationPriority } from "@/constants/notificationPriority";

export type CommunicationTemplateRecord = {
  id: string;
  key: string;
  channel: CommunicationChannel;
  title: string;
  body: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CommunicationLogRecord = {
  id: string;
  patientId: string | null;
  patientName: string | null;
  patientHospitalNumber: string | null;
  billId: string | null;
  templateId: string | null;
  templateKey: string | null;
  templateTitle: string | null;
  channel: CommunicationChannel;
  status: CommunicationStatus;
  destination: string;
  payloadTitle: string | null;
  payloadBody: string | null;
  createdAt: string;
  queueId: string | null;
  queueStatus: CommunicationStatus | null;
  retryCount: number | null;
  lastError: string | null;
};

export type MessageQueueRecord = {
  id: string;
  communicationLogId: string;
  templateId: string | null;
  channel: CommunicationChannel;
  destination: string;
  status: CommunicationStatus;
  retryCount: number;
  lastError: string | null;
  nextAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationItemRecord = {
  id: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  href: string | null;
  read: boolean;
  acknowledgedAt: string | null;
  sourceType: string | null;
  sourceId: string | null;
  targetRole: string | null;
  createdAt: string;
};

export type AnnouncementTargetRecord = {
  id: string;
  targetType: AnnouncementTargetType;
  targetValue: string | null;
};

export type AnnouncementPostRecord = {
  id: string;
  title: string;
  body: string;
  status: AnnouncementStatus;
  priority: NotificationPriority;
  pinned: boolean;
  acknowledgementRequired: boolean;
  expiresAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  targets: AnnouncementTargetRecord[];
};

export type CommunicationFilters = {
  q?: string;
  status?: CommunicationStatus | "ALL";
};

export type CommunicationWorkspaceSummary = {
  templates: number;
  activeTemplates: number;
  logs: number;
  queued: number;
  failed: number;
  unreadNotifications: number;
  publishedAnnouncements: number;
};

export type CommunicationWorkspaceResponse = {
  templates: CommunicationTemplateRecord[];
  logs: CommunicationLogRecord[];
  queue: MessageQueueRecord[];
  notifications: NotificationItemRecord[];
  announcements: AnnouncementPostRecord[];
  summary: CommunicationWorkspaceSummary;
  filters: {
    q: string;
    status: CommunicationStatus | "ALL";
  };
};

export type CommunicationTemplateUpsertInput = {
  key: string;
  channel: CommunicationChannel;
  title: string;
  body: string;
  active: boolean;
};

export type CommunicationTemplateUpdateInput =
  & Partial<CommunicationTemplateUpsertInput>
  & {
    id: string;
  };

export type CommunicationSendInput = {
  templateId: string;
  patientId?: string;
  destination: string;
};

export type MessageQueueActionInput = {
  id: string;
  action: "MARK_SENT" | "MARK_DELIVERED" | "MARK_FAILED" | "REQUEUE";
  errorMessage?: string;
};

export type NotificationUpdateInput = {
  id: string;
  action: "MARK_READ" | "ACKNOWLEDGE";
};

export type AnnouncementTargetInput = {
  targetType: AnnouncementTargetType;
  targetValue?: string;
};

export type AnnouncementUpsertInput = {
  title: string;
  body: string;
  status: AnnouncementStatus;
  priority: NotificationPriority;
  pinned: boolean;
  acknowledgementRequired: boolean;
  expiresAt?: string;
  targets: AnnouncementTargetInput[];
};
