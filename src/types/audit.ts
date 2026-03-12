export type AuditLogFilters = {
  q?: string;
  action?: string;
  entityType?: string;
  limit?: number;
};

export type AuditSeverity = "normal" | "elevated";

export type AuditLogRecord = {
  id: string;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  severity: AuditSeverity;
  summary: string;
  createdAt: string;
};

export type AuditLogFeedResponse = {
  entries: AuditLogRecord[];
  availableActions: string[];
  availableEntities: string[];
  summary: {
    total: number;
    sensitive: number;
    uniqueActors: number;
    last24Hours: number;
  };
  filters: Required<AuditLogFilters>;
};
