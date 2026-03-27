"use client";

import {
  AlertTriangle,
  Eye,
  FilterX,
  Loader2,
  Search,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import {
  RecordPreviewDialog,
  RecordPreviewField,
  RecordPreviewSection,
} from "@/components/ui/record-preview-dialog";
import { SurfaceCard } from "@/components/ui/surface-card";
import { ThemedSelect } from "@/components/ui/themed-select";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { useAuditLogFeed } from "@/hooks/useAuditLogsApi";
import type { AuditLogRecord, AuditSeverity } from "@/types/audit";

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

type AuditDomainFilter =
  | "all"
  | "access"
  | "billing"
  | "clinical"
  | "communications"
  | "other";

type SeverityFilter = "all" | AuditSeverity;

function resolveAuditDomain(entry: AuditLogRecord): Exclude<AuditDomainFilter, "all"> {
  const haystack = `${entry.action} ${entry.entityType} ${Object.keys(entry.metadata).join(" ")}`
    .toLowerCase();

  if (/(auth|login|sign|session|access|permission|staff)/.test(haystack)) {
    return "access";
  }

  if (/(bill|payment|charge|invoice|settlement|refund)/.test(haystack)) {
    return "billing";
  }

  if (/(communication|message|notification|announcement|template|email|sms|whatsapp)/.test(haystack)) {
    return "communications";
  }

  if (/(patient|doctor|appointment|admission|occupancy|bed|ward|discharge|consent|clinical)/.test(haystack)) {
    return "clinical";
  }

  return "other";
}

export function AuditLogViewer({ hideHeader = false }: AuditLogViewerProps) {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [domainFilter, setDomainFilter] = useState<AuditDomainFilter>("all");
  const [selectedEntry, setSelectedEntry] = useState<AuditLogRecord | null>(null);
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

  const filteredEntries = auditQuery.data.entries.filter((entry) => {
    if (severityFilter !== "all" && entry.severity !== severityFilter) {
      return false;
    }

    if (domainFilter !== "all" && resolveAuditDomain(entry) !== domainFilter) {
      return false;
    }

    return true;
  });
  const domainCounts: Record<AuditDomainFilter, number> = {
    all: auditQuery.data.entries.length,
    access: auditQuery.data.entries.filter((entry) => resolveAuditDomain(entry) === "access")
      .length,
    billing: auditQuery.data.entries.filter((entry) => resolveAuditDomain(entry) === "billing")
      .length,
    clinical: auditQuery.data.entries.filter((entry) => resolveAuditDomain(entry) === "clinical")
      .length,
    communications: auditQuery.data.entries.filter((entry) =>
      resolveAuditDomain(entry) === "communications"
    ).length,
    other: auditQuery.data.entries.filter((entry) => resolveAuditDomain(entry) === "other")
      .length,
  };
  const elevatedVisible = filteredEntries.filter((entry) => entry.severity === "elevated")
    .length;
  const latestVisible = filteredEntries[0] ?? null;
  const activeFilterCount = [
    Boolean(search),
    Boolean(action),
    Boolean(entityType),
    severityFilter !== "all",
    domainFilter !== "all",
  ].filter(Boolean).length;
  const domainOptions: Array<{
    description: string;
    label: string;
    value: AuditDomainFilter;
  }> = [
    {
      value: "all",
      label: "All events",
      description: "Complete event trail",
    },
    {
      value: "access",
      label: "Access",
      description: "Sessions and permissions",
    },
    {
      value: "billing",
      label: "Billing",
      description: "Charges and settlements",
    },
    {
      value: "clinical",
      label: "Clinical",
      description: "Care workflow records",
    },
    {
      value: "communications",
      label: "Communications",
      description: "Delivery and messaging",
    },
    {
      value: "other",
      label: "Other",
      description: "Unclassified events",
    },
  ];

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

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,0.6fr))]">
        <SurfaceCard className="xl:col-span-2">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Workspace controls
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                Trace risk by domain before opening the full event detail
              </h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Search the server-side audit feed, then narrow the visible list by event
                domain and severity so access, billing, and clinical investigations stay
                focused.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                disabled={activeFilterCount === 0}
                onClick={() => {
                  setSearch("");
                  setAction("");
                  setEntityType("");
                  setSeverityFilter("all");
                  setDomainFilter("all");
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <FilterX className="h-4 w-4" />
                Clear filters
              </Button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {domainOptions.map((option) => (
              <Button
                className="h-auto min-w-[10rem] justify-between rounded-[var(--radius-panel)] px-4 py-3 text-left"
                key={option.value}
                onClick={() => setDomainFilter(option.value)}
                size="sm"
                type="button"
                variant={domainFilter === option.value ? "secondary" : "outline"}
              >
                <span className="flex min-w-0 flex-col items-start">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                    {option.label}
                  </span>
                  <span className="text-[11px] font-medium normal-case text-muted-foreground">
                    {option.description}
                  </span>
                </span>
                <Badge variant={domainFilter === option.value ? "secondary" : "outline"}>
                  {domainCounts[option.value]}
                </Badge>
              </Button>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Matching events</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {filteredEntries.length}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Visible entries after domain and severity refinement.
          </p>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Latest visible event</p>
          <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">
            {latestVisible ? latestVisible.action : "No matching events"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {latestVisible
              ? `${formatTimestamp(latestVisible.createdAt)} by ${latestVisible.actorName ?? latestVisible.actorEmail ?? "System"}.`
              : "Adjust the filters to inspect another part of the event trail."}
          </p>
        </SurfaceCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {[
          ["Visible events", auditQuery.data.summary.total],
          ["Sensitive", auditQuery.data.summary.sensitive],
          ["Actors", auditQuery.data.summary.uniqueActors],
          ["Last 24 hours", auditQuery.data.summary.last24Hours],
        ].map(([label, value]) => (
          <SurfaceCard key={String(label)}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {value}
            </p>
          </SurfaceCard>
        ))}
      </section>

      <SurfaceCard>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.45fr_0.45fr_0.45fr]">
          <label className="block">
            <span className="text-sm font-medium text-foreground">Search</span>
            <div className="management-search-shell mt-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Action, actor, entity, metadata"
                value={search}
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-foreground">Action</span>
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
            <span className="text-sm font-medium text-foreground">Entity</span>
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

          <label className="block">
            <span className="text-sm font-medium text-foreground">Severity</span>
            <ThemedSelect
              className="mt-2"
              onChange={(event) => setSeverityFilter(event.target.value as SeverityFilter)}
              value={severityFilter}
            >
              <option value="all">All severities</option>
              <option value="elevated">Elevated only</option>
              <option value="normal">Normal only</option>
            </ThemedSelect>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Badge variant="outline">
            {activeFilterCount} active filters
          </Badge>
          <Badge variant={elevatedVisible > 0 ? "destructive" : "outline"}>
            {elevatedVisible} elevated visible
          </Badge>
          <Badge variant="outline">
            Scope {domainFilter === "all" ? "complete trail" : domainFilter}
          </Badge>
        </div>
      </SurfaceCard>

      <div className="space-y-4">
        {filteredEntries.length === 0
          ? (
            <EmptyState
              className="min-h-[18rem]"
              icon={ShieldAlert}
              title="No audit events match this view"
              description="Change the filters or widen the search to inspect another part of the operational trail."
            />
          )
          : null}

        {filteredEntries.map((entry) => (
          <SurfaceCard key={entry.id}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge
                    variant={entry.severity === "elevated" ? "destructive" : "default"}
                  >
                    {entry.severity}
                  </Badge>
                  <Badge variant="outline">{entry.entityType}</Badge>
                  <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {entry.action}
                  </span>
                </div>
                <p className="mt-3 text-lg font-semibold text-foreground">
                  {entry.summary}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Actor: {entry.actorName ?? entry.actorEmail ?? "System"}
                </p>
              </div>

              <div className="text-sm text-muted-foreground">
                {formatTimestamp(entry.createdAt)}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Badge variant="outline">
                Domain {resolveAuditDomain(entry)}
              </Badge>
              <Badge variant="outline">
                {Object.keys(entry.metadata).length} metadata fields
              </Badge>
              <Button
                onClick={() => setSelectedEntry(entry)}
                size="sm"
                type="button"
                variant="outline"
              >
                <Eye className="h-4 w-4" />
                View details
              </Button>
            </div>

            {Object.keys(entry.metadata).length > 0
              ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(entry.metadata).slice(0, 6).map(([key, value]) => (
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

      <RecordPreviewDialog
        description={selectedEntry
          ? "Inspect the full actor, entity, and metadata context for this audit event."
          : undefined}
        eyebrow="Audit event"
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEntry(null);
          }
        }}
        open={selectedEntry !== null}
        status={selectedEntry
          ? (
            <Badge variant={selectedEntry.severity === "elevated" ? "destructive" : "secondary"}>
              {selectedEntry.severity}
            </Badge>
          )
          : undefined}
        title={selectedEntry?.summary ?? "Audit event detail"}
      >
        {selectedEntry
          ? (
            <>
              <RecordPreviewSection
                description="Core trail identifiers used during operational review."
                title="Event context"
              >
                <RecordPreviewField label="Action" value={selectedEntry.action} />
                <RecordPreviewField label="Entity type" value={selectedEntry.entityType} />
                <RecordPreviewField
                  label="Entity id"
                  value={selectedEntry.entityId ?? "Not attached"}
                />
                <RecordPreviewField
                  label="Occurred at"
                  value={formatTimestamp(selectedEntry.createdAt)}
                />
              </RecordPreviewSection>

              <RecordPreviewSection
                description="Actor identity and routing classification."
                title="Actor and scope"
              >
                <RecordPreviewField
                  label="Actor"
                  value={selectedEntry.actorName ?? selectedEntry.actorEmail ?? "System"}
                />
                <RecordPreviewField
                  label="Actor email"
                  value={selectedEntry.actorEmail ?? "Not recorded"}
                />
                <RecordPreviewField
                  label="Severity"
                  value={selectedEntry.severity}
                />
                <RecordPreviewField
                  label="Domain"
                  value={resolveAuditDomain(selectedEntry)}
                />
              </RecordPreviewSection>

              <RecordPreviewSection
                className="md:[&>div]:grid-cols-1"
                description="Raw metadata captured with the event for forensic review."
                title="Metadata"
              >
                {Object.entries(selectedEntry.metadata).length > 0
                  ? Object.entries(selectedEntry.metadata).map(([key, value]) => (
                    <RecordPreviewField
                      className="md:col-span-1"
                      key={key}
                      label={key}
                      value={
                        typeof value === "object" && value !== null
                          ? (
                            <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-muted/40 p-3 text-xs leading-6 text-foreground">
                              {JSON.stringify(value, null, 2)}
                            </pre>
                          )
                          : String(value)
                      }
                    />
                  ))
                  : (
                    <RecordPreviewField
                      label="Metadata"
                      value="No additional metadata was attached to this event."
                    />
                  )}
              </RecordPreviewSection>
            </>
          )
          : null}
      </RecordPreviewDialog>
    </div>
  );
}
