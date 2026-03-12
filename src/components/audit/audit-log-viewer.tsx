"use client";

import { AlertTriangle, Loader2, Search } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { ThemedSelect } from "@/components/ui/themed-select";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { useAuditLogFeed } from "@/hooks/useAuditLogsApi";

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type AuditLogViewerProps = {
  hideHeader?: boolean;
};

export function AuditLogViewer({ hideHeader = false }: AuditLogViewerProps) {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const deferredSearch = useDebouncedSearch(search);
  const auditQuery = useAuditLogFeed({
    q: deferredSearch,
    action,
    entityType,
    limit: 80,
  });

  if (auditQuery.isLoading) {
    return (
      <EmptyState
        className="min-h-[36rem]"
        icon={Loader2}
        title="Loading audit trail"
        description="Sensitive workflow events are being collected."
      />
    );
  }

  if (auditQuery.isError || !auditQuery.data) {
    return (
      <EmptyState
        className="min-h-[36rem]"
        icon={AlertTriangle}
        title="Audit trail is unavailable"
        description={auditQuery.error instanceof Error
          ? auditQuery.error.message
          : "The audit service request failed."}
      />
    );
  }

  return (
    <div className="space-y-6">
      {hideHeader
        ? null
        : (
          <PageHeader
            eyebrow="Phase 7 audit"
            title="Audit trail and access visibility"
            description="Permission changes, billing actions, communications, document state changes, and sign-in outcomes are preserved as a searchable operational timeline."
          />
        )}

      <section className="grid gap-4 xl:grid-cols-4">
        {[
          ["Visible events", auditQuery.data.summary.total],
          ["Sensitive", auditQuery.data.summary.sensitive],
          ["Actors", auditQuery.data.summary.uniqueActors],
          ["Last 24 hours", auditQuery.data.summary.last24Hours],
        ].map(([label, value]) => (
          <SurfaceCard key={String(label)}>
            <p className="text-sm text-ink-soft">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">
              {value}
            </p>
          </SurfaceCard>
        ))}
      </section>

      <SurfaceCard>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.4fr_0.4fr]">
          <label className="block">
            <span className="text-sm font-medium text-ink">Search</span>
            <div className="glass-panel-muted mt-2 flex items-center gap-3 rounded-[22px] px-4 py-3">
              <Search className="h-4 w-4 text-ink-soft" />
              <Input
                className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Action, actor, entity, metadata"
                value={search}
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-ink">Action</span>
            <ThemedSelect
              className="mt-2"
              onChange={(event) => setAction(event.target.value)}
              value={action}
            >
              <option value="">All actions</option>
              {auditQuery.data.availableActions.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </ThemedSelect>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-ink">Entity</span>
            <ThemedSelect
              className="mt-2"
              onChange={(event) => setEntityType(event.target.value)}
              value={entityType}
            >
              <option value="">All entities</option>
              {auditQuery.data.availableEntities.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </ThemedSelect>
          </label>
        </div>
      </SurfaceCard>

      <div className="space-y-4">
        {auditQuery.data.entries.map((entry) => (
          <SurfaceCard key={entry.id}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge
                    variant={entry.severity === "elevated" ? "destructive" : "default"}
                  >
                    {entry.severity}
                  </Badge>
                  <span className="text-xs uppercase tracking-[0.16em] text-ink-soft">
                    {entry.action}
                  </span>
                </div>
                <p className="mt-3 text-lg font-semibold text-ink">
                  {entry.summary}
                </p>
                <p className="mt-2 text-sm text-ink-soft">
                  Actor: {entry.actorName ?? entry.actorEmail ?? "System"}
                </p>
              </div>

              <div className="text-sm text-ink-soft">
                {formatTimestamp(entry.createdAt)}
              </div>
            </div>

            {Object.keys(entry.metadata).length > 0
              ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(entry.metadata).slice(0, 6).map((
                    [key, value],
                  ) => (
                    <Badge key={key} variant="outline">
                      {key}: {String(value)}
                    </Badge>
                  ))}
                </div>
              )
              : null}
          </SurfaceCard>
        ))}
      </div>
    </div>
  );
}
