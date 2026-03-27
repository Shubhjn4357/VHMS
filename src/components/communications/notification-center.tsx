"use client";

import Link from "next/link";
import { Bell, BookmarkCheck, ExternalLink, Search, Siren } from "lucide-react";
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
import { ROLE_LABELS } from "@/constants/roles";
import type {
  CommunicationWorkspaceSummary,
  NotificationItemRecord,
} from "@/types/communication";

type NotificationScopeFilter =
  | "all"
  | "unread"
  | "read"
  | "urgent"
  | "ack-pending"
  | "linked";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRoleLabel(role: string | null) {
  if (!role) {
    return "All roles";
  }

  return role in ROLE_LABELS
    ? ROLE_LABELS[role as keyof typeof ROLE_LABELS]
    : role;
}

function notificationMatchesSearch(
  notification: NotificationItemRecord,
  searchValue: string,
) {
  const normalized = searchValue.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return [
    notification.title,
    notification.body,
    notification.priority,
    notification.sourceType ?? "",
    notification.targetRole ?? "",
  ].some((value) => value.toLowerCase().includes(normalized));
}

function getNotificationScopeLabel(scope: NotificationScopeFilter) {
  switch (scope) {
    case "unread":
      return "Unread";
    case "read":
      return "Read";
    case "urgent":
      return "Urgent";
    case "ack-pending":
      return "Ack pending";
    case "linked":
      return "Linked";
    default:
      return "All alerts";
  }
}

type NotificationCenterProps = {
  notifications: NotificationItemRecord[];
  summary: CommunicationWorkspaceSummary;
};

export function NotificationCenter({
  notifications,
  summary,
}: NotificationCenterProps) {
  const [searchValue, setSearchValue] = useState("");
  const [scopeFilter, setScopeFilter] = useState<NotificationScopeFilter>("all");
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationItemRecord | null>(null);

  const filteredNotifications = notifications.filter((notification) => {
    if (!notificationMatchesSearch(notification, searchValue)) {
      return false;
    }

    switch (scopeFilter) {
      case "unread":
        return !notification.read;
      case "read":
        return notification.read;
      case "urgent":
        return notification.priority === "URGENT";
      case "ack-pending":
        return !notification.acknowledgedAt;
      case "linked":
        return Boolean(notification.href || notification.sourceId);
      default:
        return true;
    }
  });

  const filterCounts: Record<NotificationScopeFilter, number> = {
    all: notifications.length,
    unread: notifications.filter((notification) => !notification.read).length,
    read: notifications.filter((notification) => notification.read).length,
    urgent: notifications.filter((notification) => notification.priority === "URGENT").length,
    "ack-pending": notifications.filter((notification) => !notification.acknowledgedAt).length,
    linked: notifications.filter((notification) =>
      Boolean(notification.href || notification.sourceId)
    ).length,
  };
  const filterOptions: Array<{
    description: string;
    label: string;
    value: NotificationScopeFilter;
  }> = [
    {
      value: "all",
      label: "All alerts",
      description: "Complete inbox",
    },
    {
      value: "unread",
      label: "Unread",
      description: "Needs review",
    },
    {
      value: "read",
      label: "Read",
      description: "Previously reviewed",
    },
    {
      value: "urgent",
      label: "Urgent",
      description: "Highest priority only",
    },
    {
      value: "ack-pending",
      label: "Ack pending",
      description: "Not acknowledged yet",
    },
    {
      value: "linked",
      label: "Linked",
      description: "Has route or source",
    },
  ];
  const latestUnread = notifications.find((notification) => !notification.read) ?? null;
  const linkedCount = filterCounts.linked;
  const ackPendingCount = filterCounts["ack-pending"];

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
                Isolate unread or urgent alerts before drilling into the full notification
              </h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Search the notification inbox and focus on unread, urgent, acknowledgement
                pending, or linked items so floor leads can work the queue without reading
                every alert.
              </p>
            </div>

            <div className="w-full max-w-md">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Search notifications
              </label>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Title, body, source, role, or priority"
                  type="search"
                  value={searchValue}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {filterOptions.map((option) => (
              <Button
                className="h-auto min-w-40 justify-between rounded-(--radius-panel) px-4 py-3 text-left"
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
          <p className="text-sm text-muted-foreground">Matching alerts</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {filteredNotifications.length}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Current result set inside the active notification scope.
          </p>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Published notices linked</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {summary.publishedAnnouncements}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Live announcements that can cascade into inbox notifications.
          </p>
        </SurfaceCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Unread</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {summary.unreadNotifications}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Alerts still waiting for staff review in the live inbox.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Ack pending</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {ackPendingCount}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Notifications with no recorded acknowledgement timestamp.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Linked sources</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {linkedCount}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Alerts that point back to a route, source entity, or originating event.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Latest unread</p>
          <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">
            {latestUnread ? latestUnread.title : "Inbox clear"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {latestUnread
              ? `Created ${formatTimestamp(latestUnread.createdAt)}`
              : "No unread notifications remain in the current workspace."}
          </p>
        </SurfaceCard>
      </section>

      <section className="grid gap-4">
        {filteredNotifications.length === 0
          ? (
            <EmptyState
              className="min-h-72"
              description={`No notifications match the current ${getNotificationScopeLabel(scopeFilter).toLowerCase()} view.`}
              icon={Bell}
              title="No notifications available in this workspace"
            />
          )
          : null}

        {filteredNotifications.map((notification) => (
          <SurfaceCard key={notification.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={notification.priority === "URGENT"
                      ? "status-pill-warning border-transparent"
                      : undefined}
                    variant="outline"
                  >
                    {notification.priority}
                  </Badge>
                  <Badge variant={notification.read ? "outline" : "success"}>
                    {notification.read ? "Read" : "Unread"}
                  </Badge>
                  {notification.acknowledgedAt
                    ? <Badge variant="secondary">Acknowledged</Badge>
                    : <Badge variant="warning">Ack pending</Badge>}
                  {notification.targetRole
                    ? <Badge variant="outline">{getRoleLabel(notification.targetRole)}</Badge>
                    : null}
                </div>
                <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
                  {notification.title}
                </h2>
                <p className="mt-3 line-clamp-3 text-sm leading-7 text-muted-foreground">
                  {notification.body}
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  <span>Source: {notification.sourceType ?? "System"}</span>
                  <span>Created: {formatTimestamp(notification.createdAt)}</span>
                  {notification.acknowledgedAt
                    ? <span>Acknowledged: {formatTimestamp(notification.acknowledgedAt)}</span>
                    : null}
                </div>
              </div>

              <div className="flex w-full max-w-xs flex-col gap-3">
                <div className="management-subtle-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Routing watch
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    Audience {getRoleLabel(notification.targetRole)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Source id {notification.sourceId ?? "Not linked"}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Route {notification.href ?? "No direct route"}
                  </p>
                </div>
                <Button
                  onClick={() => setSelectedNotification(notification)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Bell className="h-4 w-4" />
                  View details
                </Button>
              </div>
            </div>
          </SurfaceCard>
        ))}
      </section>

      <RecordPreviewDialog
        actions={selectedNotification?.href
          ? (
            <Button asChild size="sm" type="button" variant="outline">
              <Link href={selectedNotification.href}>
                <ExternalLink className="h-4 w-4" />
                Open linked route
              </Link>
            </Button>
          )
          : undefined}
        description={selectedNotification
          ? "Inspect source, audience, acknowledgement, and route metadata for this alert."
          : undefined}
        eyebrow="Notification detail"
        onOpenChange={(open) => {
          if (!open) {
            setSelectedNotification(null);
          }
        }}
        open={selectedNotification !== null}
        status={selectedNotification
          ? (
            <Badge variant={selectedNotification.read ? "outline" : "success"}>
              {selectedNotification.read ? "Read" : "Unread"}
            </Badge>
          )
          : undefined}
        title={selectedNotification?.title ?? "Notification detail"}
      >
        {selectedNotification
          ? (
            <>
              <RecordPreviewSection
                description="State and delivery posture for this notification."
                icon={Siren}
                title="Alert state"
              >
                <RecordPreviewField label="Priority" value={selectedNotification.priority} />
                <RecordPreviewField
                  label="Read state"
                  value={selectedNotification.read ? "Read" : "Unread"}
                />
                <RecordPreviewField
                  label="Acknowledged"
                  value={selectedNotification.acknowledgedAt ? "Yes" : "No"}
                />
                <RecordPreviewField
                  label="Scope filter"
                  value={getNotificationScopeLabel(scopeFilter)}
                />
              </RecordPreviewSection>

              <RecordPreviewSection
                description="Audience, source, and route linkage for the alert."
                icon={BookmarkCheck}
                title="Routing context"
              >
                <RecordPreviewField
                  label="Target role"
                  value={getRoleLabel(selectedNotification.targetRole)}
                />
                <RecordPreviewField
                  label="Source type"
                  value={selectedNotification.sourceType ?? "System"}
                />
                <RecordPreviewField
                  label="Source id"
                  value={selectedNotification.sourceId ?? "Not linked"}
                />
                <RecordPreviewField
                  label="Route"
                  value={selectedNotification.href ?? "No direct route"}
                />
              </RecordPreviewSection>

              <RecordPreviewSection
                className="md:[&>div]:grid-cols-1"
                description="Full notification payload and timestamps for review."
                icon={Bell}
                title="Message detail"
              >
                <RecordPreviewField
                  className="md:col-span-1"
                  label="Created"
                  value={formatTimestamp(selectedNotification.createdAt)}
                />
                <RecordPreviewField
                  className="md:col-span-1"
                  label="Acknowledged at"
                  value={formatTimestamp(selectedNotification.acknowledgedAt)}
                />
                <RecordPreviewField
                  className="md:col-span-1"
                  label="Message body"
                  value={(
                    <div className="whitespace-pre-wrap text-sm leading-7">
                      {selectedNotification.body}
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
