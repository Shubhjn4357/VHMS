"use client";

import Link from "next/link";
import { Megaphone, Pin, Search, Siren, TimerReset } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  RecordPreviewDialog,
  RecordPreviewField,
  RecordPreviewSection,
} from "@/components/ui/record-preview-dialog";
import { SurfaceCard } from "@/components/ui/surface-card";
import type {
  AnnouncementPostRecord,
  CommunicationWorkspaceSummary,
} from "@/types/communication";

type AnnouncementScopeFilter =
  | "all"
  | "published"
  | "draft"
  | "pinned"
  | "ack-required"
  | "expiring";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isExpiringSoon(announcement: AnnouncementPostRecord) {
  if (!announcement.expiresAt) {
    return false;
  }

  const expiresAt = new Date(announcement.expiresAt).getTime();
  const now = Date.now();

  return expiresAt > now && expiresAt - now <= 1000 * 60 * 60 * 24 * 3;
}

function announcementMatchesSearch(
  announcement: AnnouncementPostRecord,
  searchValue: string,
) {
  const normalized = searchValue.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  const targetText = announcement.targets
    .map((target) => `${target.targetType} ${target.targetValue ?? ""}`)
    .join(" ");

  return [
    announcement.title,
    announcement.body,
    announcement.status,
    announcement.priority,
    targetText,
  ].some((value) => value.toLowerCase().includes(normalized));
}

function getAnnouncementScopeLabel(scope: AnnouncementScopeFilter) {
  switch (scope) {
    case "published":
      return "Published";
    case "draft":
      return "Draft";
    case "pinned":
      return "Pinned";
    case "ack-required":
      return "Ack required";
    case "expiring":
      return "Expiring soon";
    default:
      return "All broadcasts";
  }
}

type AnnouncementCenterProps = {
  announcements: AnnouncementPostRecord[];
  summary: CommunicationWorkspaceSummary;
};

export function AnnouncementCenter({
  announcements,
  summary,
}: AnnouncementCenterProps) {
  const [searchValue, setSearchValue] = useState("");
  const [scopeFilter, setScopeFilter] = useState<AnnouncementScopeFilter>("all");
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<AnnouncementPostRecord | null>(null);

  const filteredAnnouncements = announcements.filter((announcement) => {
    if (!announcementMatchesSearch(announcement, searchValue)) {
      return false;
    }

    switch (scopeFilter) {
      case "published":
        return announcement.status === "PUBLISHED";
      case "draft":
        return announcement.status === "DRAFT";
      case "pinned":
        return announcement.pinned;
      case "ack-required":
        return announcement.acknowledgementRequired;
      case "expiring":
        return isExpiringSoon(announcement);
      default:
        return true;
    }
  });

  const filterCounts: Record<AnnouncementScopeFilter, number> = {
    all: announcements.length,
    published: announcements.filter((announcement) => announcement.status === "PUBLISHED")
      .length,
    draft: announcements.filter((announcement) => announcement.status === "DRAFT").length,
    pinned: announcements.filter((announcement) => announcement.pinned).length,
    "ack-required": announcements.filter((announcement) =>
      announcement.acknowledgementRequired
    ).length,
    expiring: announcements.filter((announcement) => isExpiringSoon(announcement)).length,
  };
  const filterOptions: Array<{
    description: string;
    label: string;
    value: AnnouncementScopeFilter;
  }> = [
    {
      value: "all",
      label: "All broadcasts",
      description: "Full notice board",
    },
    {
      value: "published",
      label: "Published",
      description: "Live broadcasts",
    },
    {
      value: "draft",
      label: "Drafts",
      description: "Not published yet",
    },
    {
      value: "pinned",
      label: "Pinned",
      description: "Priority top posts",
    },
    {
      value: "ack-required",
      label: "Ack required",
      description: "Needs staff acknowledgement",
    },
    {
      value: "expiring",
      label: "Expiring",
      description: "Within 72 hours",
    },
  ];
  const latestPublished = announcements.find((announcement) =>
    announcement.status === "PUBLISHED"
  ) ?? null;
  const pinnedCount = filterCounts.pinned;
  const ackRequiredCount = filterCounts["ack-required"];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,0.6fr))]">
        <SurfaceCard className="xl:col-span-2">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Workspace controls
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                Narrow the notice board by publication state before reviewing the full post
              </h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Search the broadcast registry and focus on drafts, pinned notices,
                acknowledgement-required posts, or expiring announcements so supervisors can
                review the right message set fast.
              </p>
            </div>

            <div className="w-full max-w-md">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Search announcements
              </label>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Title, body, target, status, or priority"
                  type="search"
                  value={searchValue}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {filterOptions.map((option) => (
              <Button
                className="h-auto min-w-[10rem] justify-between rounded-[var(--radius-panel)] px-4 py-3 text-left"
                key={option.value}
                onClick={() => setScopeFilter(option.value)}
                size="sm"
                type="button"
                variant={scopeFilter === option.value ? "secondary" : "outline"}
              >
                <span className="flex min-w-0 flex-col items-start">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                    {option.label}
                  </span>
                  <span className="text-[11px] font-medium normal-case text-muted-foreground">
                    {option.description}
                  </span>
                </span>
                <Badge variant={scopeFilter === option.value ? "secondary" : "outline"}>
                  {filterCounts[option.value]}
                </Badge>
              </Button>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Matching broadcasts</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {filteredAnnouncements.length}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Current result set inside the active announcement scope.
          </p>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Unread linked alerts</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {summary.unreadNotifications}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Related in-app notifications still waiting for acknowledgement.
          </p>
        </SurfaceCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Published</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {summary.publishedAnnouncements}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Live broadcasts currently visible on the internal notice board.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Pinned</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {pinnedCount}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Announcements locked to the top for operational attention.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Ack required</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {ackRequiredCount}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Broadcasts that expect a deliberate review acknowledgement.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Latest published</p>
          <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">
            {latestPublished ? latestPublished.title : "No live broadcast"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {latestPublished
              ? `Published ${formatTimestamp(latestPublished.publishedAt)}`
              : "Publish an announcement from the communication engine to populate this watch card."}
          </p>
        </SurfaceCard>
      </section>

      <section className="grid gap-4">
        {filteredAnnouncements.length === 0
          ? (
            <EmptyState
              className="min-h-72"
              description={`No announcements match the current ${getAnnouncementScopeLabel(scopeFilter).toLowerCase()} view.`}
              icon={Megaphone}
              title="No announcements available in this workspace"
            />
          )
          : null}

        {filteredAnnouncements.map((announcement) => (
          <SurfaceCard key={announcement.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={announcement.status === "PUBLISHED" ? "success" : "outline"}>
                    {announcement.status}
                  </Badge>
                  <Badge
                    className={announcement.priority === "URGENT"
                      ? "status-pill-warning border-transparent"
                      : undefined}
                    variant="outline"
                  >
                    {announcement.priority}
                  </Badge>
                  {announcement.pinned
                    ? (
                      <Badge className="status-pill-warning border-transparent" variant="outline">
                        Pinned
                      </Badge>
                    )
                    : null}
                  {announcement.acknowledgementRequired
                    ? <Badge variant="secondary">Ack required</Badge>
                    : null}
                  {isExpiringSoon(announcement)
                    ? <Badge variant="warning">Expiring soon</Badge>
                    : null}
                </div>
                <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
                  {announcement.title}
                </h2>
                <p className="mt-3 line-clamp-3 text-sm leading-7 text-muted-foreground">
                  {announcement.body}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {announcement.targets.map((target) => (
                    <span
                      className="management-selection-pill px-3 py-2 text-xs font-medium text-muted-foreground"
                      key={target.id}
                    >
                      {target.targetType}
                      {target.targetValue ? `: ${target.targetValue}` : ""}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex w-full max-w-xs flex-col gap-3">
                <div className="management-subtle-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Publication watch
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    Created {formatTimestamp(announcement.createdAt)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Published {formatTimestamp(announcement.publishedAt)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Expires {formatTimestamp(announcement.expiresAt)}
                  </p>
                </div>
                <Button
                  onClick={() => setSelectedAnnouncement(announcement)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Megaphone className="h-4 w-4" />
                  View details
                </Button>
              </div>
            </div>
          </SurfaceCard>
        ))}
      </section>

      <RecordPreviewDialog
        actions={(
          <Button asChild size="sm" type="button" variant="outline">
            <Link href="/dashboard/communications">Open communication engine</Link>
          </Button>
        )}
        description={selectedAnnouncement
          ? "Inspect publication state, targeting, and expiry data before changing the broadcast."
          : undefined}
        eyebrow="Announcement detail"
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAnnouncement(null);
          }
        }}
        open={selectedAnnouncement !== null}
        status={selectedAnnouncement
          ? (
            <Badge variant={selectedAnnouncement.status === "PUBLISHED" ? "success" : "outline"}>
              {selectedAnnouncement.status}
            </Badge>
          )
          : undefined}
        title={selectedAnnouncement?.title ?? "Announcement detail"}
      >
        {selectedAnnouncement
          ? (
            <>
              <RecordPreviewSection
                description="Publication and urgency attributes for this broadcast."
                icon={Siren}
                title="Broadcast state"
              >
                <RecordPreviewField label="Priority" value={selectedAnnouncement.priority} />
                <RecordPreviewField
                  label="Pinned"
                  value={selectedAnnouncement.pinned ? "Yes" : "No"}
                />
                <RecordPreviewField
                  label="Ack required"
                  value={selectedAnnouncement.acknowledgementRequired ? "Yes" : "No"}
                />
                <RecordPreviewField
                  label="Scope filter"
                  value={getAnnouncementScopeLabel(scopeFilter)}
                />
              </RecordPreviewSection>

              <RecordPreviewSection
                description="Timing and lifecycle data for the notice."
                icon={TimerReset}
                title="Timeline"
              >
                <RecordPreviewField
                  label="Created"
                  value={formatTimestamp(selectedAnnouncement.createdAt)}
                />
                <RecordPreviewField
                  label="Updated"
                  value={formatTimestamp(selectedAnnouncement.updatedAt)}
                />
                <RecordPreviewField
                  label="Published"
                  value={formatTimestamp(selectedAnnouncement.publishedAt)}
                />
                <RecordPreviewField
                  label="Expires"
                  value={formatTimestamp(selectedAnnouncement.expiresAt)}
                />
              </RecordPreviewSection>

              <RecordPreviewSection
                className="md:[&>div]:grid-cols-1"
                description="Audience routing and body content delivered by this broadcast."
                icon={Pin}
                title="Targets and message"
              >
                <RecordPreviewField
                  className="md:col-span-1"
                  label="Targets"
                  value={selectedAnnouncement.targets.length > 0
                    ? selectedAnnouncement.targets.map((target) =>
                      `${target.targetType}${target.targetValue ? `: ${target.targetValue}` : ""}`
                    ).join(", ")
                    : "No explicit targets"}
                />
                <RecordPreviewField
                  className="md:col-span-1"
                  label="Message body"
                  value={(
                    <div className="whitespace-pre-wrap text-sm leading-7">
                      {selectedAnnouncement.body}
                    </div>
                  )}
                />
              </RecordPreviewSection>
            </>
          )
          : null}
      </RecordPreviewDialog>
    </div>
  );
}
