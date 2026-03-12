"use client";

import { useApiQuery } from "@/hooks/useApiQuery";
import type { AuditLogFeedResponse, AuditLogFilters } from "@/types/audit";

function buildAuditUrl(filters: AuditLogFilters) {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.action) {
    params.set("action", filters.action);
  }

  if (filters.entityType) {
    params.set("entityType", filters.entityType);
  }

  if (filters.limit) {
    params.set("limit", String(filters.limit));
  }

  const query = params.toString();
  return query ? `/api/audit-logs?${query}` : "/api/audit-logs";
}

export function useAuditLogFeed(filters: AuditLogFilters = {}) {
  return useApiQuery<AuditLogFeedResponse>(
    [
      "audit-log-feed",
      filters.q ?? "",
      filters.action ?? "",
      filters.entityType ?? "",
      filters.limit ?? 60,
    ],
    buildAuditUrl(filters),
  );
}
