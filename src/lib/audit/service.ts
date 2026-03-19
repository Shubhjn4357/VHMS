import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { auditLogs, users } from "@/db/schema";
import type {
  AuditLogFeedResponse,
  AuditLogFilters,
  AuditLogRecord,
} from "@/types/audit";

function parseMetadata(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function titleizeSegment(value: string) {
  return value
    .split(/[._-]+/)
    .filter(Boolean)
    .map((segment) =>
      segment.slice(0, 1).toUpperCase() + segment.slice(1).toLowerCase()
    )
    .join(" ");
}

function toSummary(
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown>,
) {
  const metadataBits = [
    typeof metadata.email === "string" ? metadata.email : null,
    typeof metadata.role === "string" ? titleizeSegment(metadata.role) : null,
    typeof metadata.status === "string"
      ? titleizeSegment(metadata.status)
      : null,
  ].filter(Boolean);

  const base = `${titleizeSegment(action)} on ${titleizeSegment(entityType)}`;
  const suffix = entityId ? ` (${entityId})` : "";

  return metadataBits.length > 0
    ? `${base}${suffix} | ${metadataBits.join(" | ")}`
    : `${base}${suffix}`;
}

function isSensitive(action: string, entityType: string) {
  const normalized = `${action} ${entityType}`.toLowerCase();

  return [
    "auth",
    "billing",
    "consent",
    "discharge",
    "staffaccess",
    "staff_access",
    "communication",
    "feature",
  ].some((token) => normalized.includes(token));
}

function toAuditRecord(row: {
  id: string;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: string;
  createdAt: Date;
}): AuditLogRecord {
  const metadata = parseMetadata(row.metadata);

  return {
    id: row.id,
    actorUserId: row.actorUserId,
    actorName: row.actorName ?? null,
    actorEmail: row.actorEmail ?? null,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId ?? null,
    metadata,
    severity: isSensitive(row.action, row.entityType) ? "elevated" : "normal",
    summary: toSummary(
      row.action,
      row.entityType,
      row.entityId ?? null,
      metadata,
    ),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listAuditLogFeed(
  filters: AuditLogFilters = {},
): Promise<AuditLogFeedResponse> {
  const db = getDb();
  const rows = await db
    .select({
      id: auditLogs.id,
      actorUserId: auditLogs.actorUserId,
      actorName: users.name,
      actorEmail: users.email,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorUserId, users.id))
    .orderBy(desc(auditLogs.createdAt));

  const q = filters.q?.trim().toLowerCase() ?? "";
  const actionFilter = filters.action?.trim().toLowerCase() ?? "";
  const entityTypeFilter = filters.entityType?.trim().toLowerCase() ?? "";
  const limit = filters.limit ?? 60;

  const records = rows.map(toAuditRecord);
  const filtered = records.filter((entry) => {
    if (actionFilter && entry.action.toLowerCase() !== actionFilter) {
      return false;
    }

    if (
      entityTypeFilter && entry.entityType.toLowerCase() !== entityTypeFilter
    ) {
      return false;
    }

    if (!q) {
      return true;
    }

    return [
      entry.action,
      entry.entityType,
      entry.entityId ?? "",
      entry.actorName ?? "",
      entry.actorEmail ?? "",
      entry.summary,
      JSON.stringify(entry.metadata),
    ].some((value) => value.toLowerCase().includes(q));
  });

  const entries = filtered.slice(0, limit);
  const since = Date.now() - 24 * 60 * 60 * 1000;

  return {
    entries,
    availableActions: [...new Set(records.map((entry) => entry.action))].sort(),
    availableEntities: [...new Set(records.map((entry) => entry.entityType))]
      .sort(),
    summary: {
      total: filtered.length,
      sensitive:
        filtered.filter((entry) => entry.severity === "elevated").length,
      uniqueActors: new Set(
        filtered.map((entry) =>
          entry.actorUserId ?? entry.actorEmail ?? "system"
        ),
      ).size,
      last24Hours:
        filtered.filter((entry) => Date.parse(entry.createdAt) >= since).length,
    },
    filters: {
      q,
      action: filters.action?.trim() ?? "",
      entityType: filters.entityType?.trim() ?? "",
      limit,
    },
  };
}

export async function listRecentAuditEntries(limit = 6) {
  return (await listAuditLogFeed({ limit })).entries;
}
