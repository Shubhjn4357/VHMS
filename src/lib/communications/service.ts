import { asc, desc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  announcementPosts,
  announcementTargets,
  communicationLogs,
  communicationTemplates,
  messageQueue,
  notificationCenterItems,
  patients,
} from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/log";
import { ApiError } from "@/lib/api/errors";
import { dispatchCommunicationViaProvider } from "@/lib/communications/providers";
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

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function parsePayload(payload: string): {
  title?: string;
  body?: string;
  provider?: string | null;
  externalId?: string | null;
} {
  try {
    return JSON.parse(payload) as {
      title?: string;
      body?: string;
      provider?: string | null;
      externalId?: string | null;
    };
  } catch {
    return {};
  }
}

function renderTemplate(
  value: string,
  patient?: typeof patients.$inferSelect | null,
) {
  return value
    .replaceAll(
      "{{patientName}}",
      patient
        ? [patient.firstName, patient.lastName].filter(Boolean).join(" ")
        : "the patient",
    )
    .replaceAll(
      "{{patientHospitalNumber}}",
      patient?.hospitalNumber ?? "pending-uhid",
    );
}

function toTemplateRecord(
  row: typeof communicationTemplates.$inferSelect,
): CommunicationTemplateRecord {
  return {
    id: row.id,
    key: row.key,
    channel: row.channel,
    title: row.title,
    body: row.body,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toQueueRecord(
  row: typeof messageQueue.$inferSelect,
): MessageQueueRecord {
  return {
    id: row.id,
    communicationLogId: row.communicationLogId,
    templateId: row.templateId ?? null,
    channel: row.channel,
    destination: row.destination,
    status: row.status,
    retryCount: row.retryCount,
    lastError: row.lastError ?? null,
    nextAttemptAt: toIsoString(row.nextAttemptAt ?? null),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toNotificationRecord(
  row: typeof notificationCenterItems.$inferSelect,
): NotificationItemRecord {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    priority: row.priority,
    href: row.href ?? null,
    read: row.read,
    acknowledgedAt: toIsoString(row.acknowledgedAt ?? null),
    sourceType: row.sourceType ?? null,
    sourceId: row.sourceId ?? null,
    targetRole: row.targetRole ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function listAnnouncementRecords() {
  const db = getDb();
  const rows = await db
    .select()
    .from(announcementPosts)
    .leftJoin(
      announcementTargets,
      eq(announcementTargets.announcementPostId, announcementPosts.id),
    )
    .orderBy(desc(announcementPosts.pinned), desc(announcementPosts.createdAt));

  const grouped = new Map<string, AnnouncementPostRecord>();

  for (const row of rows) {
    const existing = grouped.get(row.announcement_posts.id);

    if (!existing) {
      grouped.set(row.announcement_posts.id, {
        id: row.announcement_posts.id,
        title: row.announcement_posts.title,
        body: row.announcement_posts.body,
        status: row.announcement_posts.status,
        priority: row.announcement_posts.priority,
        pinned: row.announcement_posts.pinned,
        acknowledgementRequired: row.announcement_posts.acknowledgementRequired,
        expiresAt: toIsoString(row.announcement_posts.expiresAt ?? null),
        publishedAt: toIsoString(row.announcement_posts.publishedAt ?? null),
        createdAt: row.announcement_posts.createdAt.toISOString(),
        updatedAt: row.announcement_posts.updatedAt.toISOString(),
        targets: row.announcement_targets
          ? [{
            id: row.announcement_targets.id,
            targetType: row.announcement_targets.targetType,
            targetValue: row.announcement_targets.targetValue ?? null,
          }]
          : [],
      });
      continue;
    }

    if (row.announcement_targets) {
      existing.targets.push({
        id: row.announcement_targets.id,
        targetType: row.announcement_targets.targetType,
        targetValue: row.announcement_targets.targetValue ?? null,
      });
    }
  }

  return Array.from(grouped.values());
}

async function getTemplateEntityById(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(communicationTemplates)
    .where(eq(communicationTemplates.id, id))
    .limit(1);

  return row ?? null;
}

async function getTemplateRecordById(id: string) {
  const row = await getTemplateEntityById(id);
  return row ? toTemplateRecord(row) : null;
}

async function ensureUniqueTemplateKey(key: string, ignoreId?: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(communicationTemplates)
    .where(eq(communicationTemplates.key, key))
    .limit(1);

  if (row && row.id !== ignoreId) {
    throw new ApiError(
      409,
      "Another communication template already uses this key.",
    );
  }
}

async function getQueueEntityById(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(messageQueue)
    .where(eq(messageQueue.id, id))
    .limit(1);

  return row ?? null;
}

async function getQueueRecordById(id: string) {
  const row = await getQueueEntityById(id);
  return row ? toQueueRecord(row) : null;
}

async function getDispatchableQueueMessage(id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      queueId: messageQueue.id,
      communicationLogId: communicationLogs.id,
      channel: messageQueue.channel,
      destination: messageQueue.destination,
      payload: communicationLogs.payload,
    })
    .from(messageQueue)
    .innerJoin(
      communicationLogs,
      eq(messageQueue.communicationLogId, communicationLogs.id),
    )
    .where(eq(messageQueue.id, id))
    .limit(1);

  if (!row) {
    return null;
  }

  const payload = parsePayload(row.payload);

  return {
    queueId: row.queueId,
    communicationLogId: row.communicationLogId,
    channel: row.channel,
    destination: row.destination,
    title: payload.title ?? "Hospital communication",
    body: payload.body ?? "",
    provider: payload.provider ?? null,
    externalId: payload.externalId ?? null,
  };
}

async function applyDispatchResult(
  queueId: string,
  communicationLogId: string,
  result: Awaited<ReturnType<typeof dispatchCommunicationViaProvider>>,
  previousPayload?: { title?: string; body?: string },
) {
  const db = getDb();
  const payload = JSON.stringify({
    title: previousPayload?.title ?? null,
    body: previousPayload?.body ?? null,
    provider: result.provider,
    externalId: result.externalId,
  });

  await db
    .update(messageQueue)
    .set({
      status: result.status,
      lastError: result.errorMessage,
      nextAttemptAt: result.status === "FAILED" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(messageQueue.id, queueId));

  await db
    .update(communicationLogs)
    .set({
      status: result.status,
      payload,
    })
    .where(eq(communicationLogs.id, communicationLogId));
}

async function dispatchQueuedMessage(queueId: string, actorUserId?: string | null) {
  const message = await getDispatchableQueueMessage(queueId);

  if (!message) {
    throw new ApiError(404, "Queue item not found.");
  }

  const result = await dispatchCommunicationViaProvider({
    channel: message.channel,
    destination: message.destination,
    title: message.title,
    body: message.body,
  });

  await applyDispatchResult(
    queueId,
    message.communicationLogId,
    result,
    {
      title: message.title,
      body: message.body,
    },
  );

  if (result.status === "FAILED") {
    await recordAuditLog({
      actorUserId,
      action: "communications.dispatch_failed",
      entityType: "message_queue",
      entityId: queueId,
      metadata: {
        provider: result.provider,
        errorMessage: result.errorMessage,
      },
    });
  } else if (result.status !== "QUEUED") {
    await recordAuditLog({
      actorUserId,
      action: "communications.dispatched",
      entityType: "message_queue",
      entityId: queueId,
      metadata: {
        provider: result.provider,
        externalId: result.externalId,
        status: result.status,
      },
    });
  }

  const record = await getQueueRecordById(queueId);
  if (!record) {
    throw new ApiError(500, "Unable to load the dispatched queue item.");
  }

  return record;
}

async function getNotificationEntityById(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(notificationCenterItems)
    .where(eq(notificationCenterItems.id, id))
    .limit(1);

  return row ?? null;
}

async function getNotificationRecordById(id: string) {
  const row = await getNotificationEntityById(id);
  return row ? toNotificationRecord(row) : null;
}

async function getPatientById(id?: string) {
  if (!id) {
    return null;
  }

  const db = getDb();
  const [row] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, id))
    .limit(1);

  if (!row) {
    throw new ApiError(400, "Selected patient does not exist.");
  }

  return row;
}

async function listTemplates() {
  const db = getDb();
  const rows = await db
    .select()
    .from(communicationTemplates)
    .orderBy(
      desc(communicationTemplates.active),
      asc(communicationTemplates.key),
    );

  return rows.map(toTemplateRecord);
}

async function listLogs(filters: CommunicationFilters = {}) {
  const db = getDb();
  const rows = await db
    .select()
    .from(communicationLogs)
    .leftJoin(
      communicationTemplates,
      eq(communicationLogs.templateId, communicationTemplates.id),
    )
    .leftJoin(patients, eq(communicationLogs.patientId, patients.id))
    .leftJoin(
      messageQueue,
      eq(messageQueue.communicationLogId, communicationLogs.id),
    )
    .orderBy(desc(communicationLogs.createdAt));

  const query = filters.q?.trim().toLowerCase() ?? "";
  const status = filters.status ?? "ALL";

  return rows
    .map((row): CommunicationLogRecord => {
      const payload = parsePayload(row.communication_logs.payload);
      const patient = row.patients;

      return {
        id: row.communication_logs.id,
        patientId: patient?.id ?? null,
        patientName: patient
          ? [patient.firstName, patient.lastName].filter(Boolean).join(" ")
          : null,
        patientHospitalNumber: patient?.hospitalNumber ?? null,
        billId: row.communication_logs.billId ?? null,
        templateId: row.communication_templates?.id ?? null,
        templateKey: row.communication_templates?.key ?? null,
        templateTitle: row.communication_templates?.title ?? null,
        channel: row.communication_logs.channel,
        status: row.communication_logs.status,
        destination: row.communication_logs.destination,
        payloadTitle: payload.title ?? null,
        payloadBody: payload.body ?? null,
        createdAt: row.communication_logs.createdAt.toISOString(),
        queueId: row.message_queue?.id ?? null,
        queueStatus: row.message_queue?.status ?? null,
        retryCount: row.message_queue?.retryCount ?? null,
        lastError: row.message_queue?.lastError ?? null,
      };
    })
    .filter((entry) => {
      if (status !== "ALL" && entry.status !== status) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        entry.templateTitle ?? "",
        entry.templateKey ?? "",
        entry.patientName ?? "",
        entry.patientHospitalNumber ?? "",
        entry.destination,
        entry.payloadTitle ?? "",
        entry.payloadBody ?? "",
      ].some((value) => value.toLowerCase().includes(query));
    });
}

async function listQueue() {
  const db = getDb();
  const rows = await db
    .select()
    .from(messageQueue)
    .orderBy(desc(messageQueue.updatedAt));

  return rows.map(toQueueRecord);
}

async function listNotifications() {
  const db = getDb();
  const rows = await db
    .select()
    .from(notificationCenterItems)
    .orderBy(desc(notificationCenterItems.createdAt));

  return rows.map(toNotificationRecord);
}

function summarize(payload: {
  templates: CommunicationTemplateRecord[];
  logs: CommunicationLogRecord[];
  notifications: NotificationItemRecord[];
  announcements: AnnouncementPostRecord[];
}) {
  return {
    templates: payload.templates.length,
    activeTemplates:
      payload.templates.filter((template) => template.active).length,
    logs: payload.logs.length,
    queued: payload.logs.filter((log) => log.status === "QUEUED").length,
    failed: payload.logs.filter((log) => log.status === "FAILED").length,
    unreadNotifications:
      payload.notifications.filter((item) => !item.read).length,
    publishedAnnouncements:
      payload.announcements.filter((item) => item.status === "PUBLISHED")
        .length,
  };
}

export async function listCommunicationWorkspace(
  filters: CommunicationFilters = {},
): Promise<CommunicationWorkspaceResponse> {
  const [templates, logs, queue, notifications, announcements] = await Promise
    .all([
      listTemplates(),
      listLogs(filters),
      listQueue(),
      listNotifications(),
      listAnnouncementRecords(),
    ]);

  return {
    templates,
    logs,
    queue,
    notifications,
    announcements,
    summary: summarize({
      templates,
      logs,
      notifications,
      announcements,
    }),
    filters: {
      q: filters.q?.trim().toLowerCase() ?? "",
      status: filters.status ?? "ALL",
    },
  };
}

export async function createCommunicationTemplate(
  input: CommunicationTemplateUpsertInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const key = input.key.trim().toLowerCase();
  await ensureUniqueTemplateKey(key);

  const [created] = await db
    .insert(communicationTemplates)
    .values({
      key,
      channel: input.channel,
      title: input.title.trim(),
      body: input.body.trim(),
      active: input.active,
    })
    .returning({ id: communicationTemplates.id });

  if (!created) {
    throw new ApiError(500, "Unable to create the communication template.");
  }

  await recordAuditLog({
    actorUserId,
    action: "communications.template.created",
    entityType: "communication_template",
    entityId: created.id,
    metadata: {
      key,
      channel: input.channel,
    },
  });

  const record = await getTemplateRecordById(created.id);
  if (!record) {
    throw new ApiError(
      500,
      "Unable to load the created communication template.",
    );
  }

  return record;
}

export async function updateCommunicationTemplate(
  input: CommunicationTemplateUpdateInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const existing = await getTemplateEntityById(input.id);

  if (!existing) {
    throw new ApiError(404, "Communication template not found.");
  }

  const nextKey = input.key?.trim().toLowerCase() ?? existing.key;
  await ensureUniqueTemplateKey(nextKey, existing.id);

  await db
    .update(communicationTemplates)
    .set({
      key: nextKey,
      channel: input.channel ?? existing.channel,
      title: input.title?.trim() ?? existing.title,
      body: input.body?.trim() ?? existing.body,
      active: input.active ?? existing.active,
      updatedAt: new Date(),
    })
    .where(eq(communicationTemplates.id, input.id));

  await recordAuditLog({
    actorUserId,
    action: "communications.template.updated",
    entityType: "communication_template",
    entityId: input.id,
    metadata: {
      key: nextKey,
    },
  });

  const record = await getTemplateRecordById(input.id);
  if (!record) {
    throw new ApiError(
      500,
      "Unable to load the updated communication template.",
    );
  }

  return record;
}

export async function sendCommunication(
  input: CommunicationSendInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const template = await getTemplateEntityById(input.templateId);

  if (!template || !template.active) {
    throw new ApiError(400, "Selected communication template is unavailable.");
  }

  const patient = await getPatientById(input.patientId?.trim() || undefined);
  const payloadTitle = renderTemplate(template.title, patient);
  const payloadBody = renderTemplate(template.body, patient);

  const [createdLog] = await db
    .insert(communicationLogs)
    .values({
      patientId: patient?.id ?? null,
      templateId: template.id,
      channel: template.channel,
      status: "QUEUED",
      destination: input.destination.trim(),
      payload: JSON.stringify({
        title: payloadTitle,
        body: payloadBody,
      }),
    })
    .returning({ id: communicationLogs.id });

  if (!createdLog) {
    throw new ApiError(500, "Unable to create the communication log.");
  }

  const [createdQueue] = await db.insert(messageQueue).values({
    communicationLogId: createdLog.id,
    templateId: template.id,
    channel: template.channel,
    destination: input.destination.trim(),
    status: "QUEUED",
  }).returning({ id: messageQueue.id });

  if (!createdQueue) {
    throw new ApiError(500, "Unable to create the message queue item.");
  }

  if (template.channel === "IN_APP_NOTIFICATION") {
    await db.insert(notificationCenterItems).values({
      title: payloadTitle,
      body: payloadBody,
      priority: "NORMAL",
      href: patient ? "/dashboard/patients" : null,
      sourceType: "communication_log",
      sourceId: createdLog.id,
      targetRole: null,
    });
  }

  await recordAuditLog({
    actorUserId,
    action: "communications.queued",
    entityType: "communication_log",
    entityId: createdLog.id,
    metadata: {
      channel: template.channel,
      destination: input.destination.trim(),
      patientId: patient?.id ?? null,
    },
  });

  await dispatchQueuedMessage(createdQueue.id, actorUserId);

  const [record] = await listLogs({}).then((logs) =>
    logs.filter((log) => log.id === createdLog.id)
  );

  if (!record) {
    throw new ApiError(500, "Unable to load the queued communication.");
  }

  return record;
}

export async function updateMessageQueueStatus(
  input: MessageQueueActionInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const existing = await getQueueEntityById(input.id);

  if (!existing) {
    throw new ApiError(404, "Queue item not found.");
  }

  const status = input.action === "MARK_SENT"
    ? "SENT"
    : input.action === "MARK_DELIVERED"
    ? "DELIVERED"
    : input.action === "MARK_FAILED"
    ? "FAILED"
    : "QUEUED";

  const retryCount =
    input.action === "REQUEUE" || input.action === "MARK_FAILED"
      ? existing.retryCount + 1
      : existing.retryCount;

  await db
    .update(messageQueue)
    .set({
      status,
      retryCount,
      lastError: input.action === "MARK_FAILED"
        ? input.errorMessage?.trim() || "Delivery failed."
        : null,
      nextAttemptAt: input.action === "REQUEUE" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(messageQueue.id, input.id));

  await db
    .update(communicationLogs)
    .set({
      status,
    })
    .where(eq(communicationLogs.id, existing.communicationLogId));

  await recordAuditLog({
    actorUserId,
    action: "communications.queue.updated",
    entityType: "message_queue",
    entityId: input.id,
    metadata: {
      action: input.action,
      communicationLogId: existing.communicationLogId,
    },
  });

  if (input.action === "REQUEUE") {
    return dispatchQueuedMessage(input.id, actorUserId);
  }

  const record = await getQueueRecordById(input.id);
  if (!record) {
    throw new ApiError(500, "Unable to load the updated queue item.");
  }

  return record;
}

export async function updateNotificationItem(
  input: NotificationUpdateInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const existing = await getNotificationEntityById(input.id);

  if (!existing) {
    throw new ApiError(404, "Notification item not found.");
  }

  await db
    .update(notificationCenterItems)
    .set({
      read: true,
      acknowledgedAt: input.action === "ACKNOWLEDGE"
        ? existing.acknowledgedAt ?? new Date()
        : existing.acknowledgedAt,
    })
    .where(eq(notificationCenterItems.id, input.id));

  await recordAuditLog({
    actorUserId,
    action: "communications.notification.updated",
    entityType: "notification_center_item",
    entityId: input.id,
    metadata: {
      action: input.action,
    },
  });

  const record = await getNotificationRecordById(input.id);
  if (!record) {
    throw new ApiError(500, "Unable to load the updated notification.");
  }

  return record;
}

export async function createAnnouncement(
  input: AnnouncementUpsertInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const expiresAt = input.expiresAt?.trim()
    ? new Date(input.expiresAt.trim())
    : null;

  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    throw new ApiError(400, "Invalid announcement expiry date.");
  }

  const [created] = await db
    .insert(announcementPosts)
    .values({
      title: input.title.trim(),
      body: input.body.trim(),
      status: input.status,
      priority: input.priority,
      pinned: input.pinned,
      acknowledgementRequired: input.acknowledgementRequired,
      expiresAt,
      publishedAt: input.status === "PUBLISHED" ? new Date() : null,
      createdByUserId: actorUserId ?? null,
    })
    .returning({ id: announcementPosts.id });

  if (!created) {
    throw new ApiError(500, "Unable to create the announcement.");
  }

  await db.insert(announcementTargets).values(
    input.targets.map((target) => ({
      announcementPostId: created.id,
      targetType: target.targetType,
      targetValue: target.targetValue?.trim() || null,
    })),
  );

  if (input.status === "PUBLISHED") {
    await db.insert(notificationCenterItems).values(
      input.targets.map((target) => ({
        title: input.title.trim(),
        body: input.body.trim(),
        priority: input.priority,
        href: "/dashboard/communications",
        read: false,
        sourceType: "announcement_post",
        sourceId: created.id,
        targetRole: target.targetType === "ROLE"
          ? target.targetValue?.trim() || null
          : target.targetType === "DEPARTMENT"
          ? `DEPARTMENT:${target.targetValue?.trim() || ""}`
          : null,
      })),
    );
  }

  await recordAuditLog({
    actorUserId,
    action: "communications.announcement.created",
    entityType: "announcement_post",
    entityId: created.id,
    metadata: {
      status: input.status,
      priority: input.priority,
    },
  });

  const [record] = await listAnnouncementRecords().then((announcements) =>
    announcements.filter((announcement) => announcement.id === created.id)
  );

  if (!record) {
    throw new ApiError(500, "Unable to load the created announcement.");
  }

  return record;
}
