import type { CommunicationStatus } from "@/constants/communicationStatus";
import type {
  CommunicationWorkflowInsight,
  CommunicationWorkflowKey,
} from "@/types/analytics";

type CommunicationInsightMessageRow = {
  channel: string;
  status: CommunicationStatus | string;
  templateKey?: string | null;
  templateTitle?: string | null;
  payload?: string | null;
  payloadTitle?: string | null;
  payloadBody?: string | null;
};

type CommunicationInsightNotificationRow = {
  title: string;
  body: string;
  read: boolean;
  href?: string | null;
  sourceType?: string | null;
  targetRole?: string | null;
};

const WORKFLOW_ORDER: CommunicationWorkflowKey[] = [
  "appointment_reminders",
  "discharge_instructions",
  "staff_notifications",
];

const WORKFLOW_LABELS: Record<CommunicationWorkflowKey, string> = {
  appointment_reminders: "Appointment reminders",
  discharge_instructions: "Discharge instructions",
  staff_notifications: "Staff notifications",
};

function normalizeText(...parts: Array<string | null | undefined>) {
  return parts
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .trim()
    .toLowerCase();
}

function parsePayload(payload?: string | null) {
  if (!payload) {
    return { title: null, body: null };
  }

  try {
    const parsed = JSON.parse(payload) as {
      title?: string | null;
      body?: string | null;
    };

    return {
      title: parsed.title ?? null,
      body: parsed.body ?? null,
    };
  } catch {
    return { title: null, body: null };
  }
}

function isAppointmentReminder(text: string) {
  return text.includes("appointment") && text.includes("reminder");
}

function isDischargeInstruction(text: string) {
  return text.includes("discharge") &&
    (text.includes("instruction") || text.includes("advice"));
}

function isStaffNotification(text: string) {
  return text.includes("operational alert") ||
    text.includes("ops.alert") ||
    text.includes("staff notification") ||
    text.includes("workflow item") ||
    text.includes("fire drill") ||
    text.includes("clinical dashboard");
}

function getWorkflowFromMessage(
  row: CommunicationInsightMessageRow,
): CommunicationWorkflowKey | null {
  const parsedPayload = parsePayload(row.payload);
  const text = normalizeText(
    row.channel,
    row.templateKey,
    row.templateTitle,
    row.payloadTitle ?? parsedPayload.title,
    row.payloadBody ?? parsedPayload.body,
  );

  if (isAppointmentReminder(text)) {
    return "appointment_reminders";
  }

  if (isDischargeInstruction(text)) {
    return "discharge_instructions";
  }

  if (row.channel === "IN_APP_NOTIFICATION" || isStaffNotification(text)) {
    return "staff_notifications";
  }

  return null;
}

function getWorkflowFromNotification(
  row: CommunicationInsightNotificationRow,
): CommunicationWorkflowKey | null {
  const text = normalizeText(
    row.title,
    row.body,
    row.href,
    row.sourceType,
    row.targetRole,
  );

  if (
    row.targetRole ||
    row.sourceType === "announcement_post" ||
    row.sourceType === "message_queue"
  ) {
    return "staff_notifications";
  }

  if (isAppointmentReminder(text)) {
    return "appointment_reminders";
  }

  if (isDischargeInstruction(text)) {
    return "discharge_instructions";
  }

  if (isStaffNotification(text)) {
    return "staff_notifications";
  }

  return null;
}

function createEmptyInsight(
  workflow: CommunicationWorkflowKey,
): CommunicationWorkflowInsight {
  return {
    workflow,
    label: WORKFLOW_LABELS[workflow],
    messageCount: 0,
    delivered: 0,
    queued: 0,
    failed: 0,
    notificationCount: 0,
    unreadNotifications: 0,
    deliveryRate: 0,
  };
}

export function buildCommunicationWorkflowInsights(input: {
  messages: CommunicationInsightMessageRow[];
  notifications: CommunicationInsightNotificationRow[];
}): CommunicationWorkflowInsight[] {
  const grouped = new Map<CommunicationWorkflowKey, CommunicationWorkflowInsight>(
    WORKFLOW_ORDER.map((workflow) => [workflow, createEmptyInsight(workflow)]),
  );

  for (const row of input.messages) {
    const workflow = getWorkflowFromMessage(row);

    if (!workflow) {
      continue;
    }

    const current = grouped.get(workflow);

    if (!current) {
      continue;
    }

    current.messageCount += 1;

    if (row.status === "QUEUED") {
      current.queued += 1;
    }

    if (row.status === "FAILED") {
      current.failed += 1;
    }

    if (row.status === "DELIVERED" || row.status === "SENT") {
      current.delivered += 1;
    }
  }

  for (const row of input.notifications) {
    const workflow = getWorkflowFromNotification(row);

    if (!workflow) {
      continue;
    }

    const current = grouped.get(workflow);

    if (!current) {
      continue;
    }

    current.notificationCount += 1;

    if (!row.read) {
      current.unreadNotifications += 1;
    }
  }

  return WORKFLOW_ORDER.map((workflow) => {
    const current = grouped.get(workflow) ?? createEmptyInsight(workflow);

    return {
      ...current,
      deliveryRate: current.delivered / Math.max(current.messageCount, 1),
    };
  });
}
