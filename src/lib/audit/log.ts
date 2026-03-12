import { getDb } from "@/db/client";
import { auditLogs } from "@/db/schema";

type AuditPayload = {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function recordAuditLog({
  actorUserId,
  action,
  entityType,
  entityId,
  metadata,
}: AuditPayload) {
  const db = getDb();

  await db.insert(auditLogs).values({
    actorUserId: actorUserId ?? null,
    action,
    entityType,
    entityId: entityId ?? null,
    metadata: JSON.stringify(metadata ?? {}),
  });
}
