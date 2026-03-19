import Link from "next/link";
import { Bell } from "lucide-react";

import { dashboardNotificationsMetadata as metadata } from "@/app/dashboard/page-metadata";
import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { listCommunicationWorkspace } from "@/lib/communications/service";

export { metadata };

export default async function DashboardNotificationsPage() {
  const workspace = await listCommunicationWorkspace();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notification center"
        title="Notifications"
        description="Review in-app notifications, unread operational alerts, acknowledgement state, and linked sources from a dedicated route."
        actions={
          <Link className={buttonVariants({ variant: "outline" })} href="/dashboard/communications">
            Open communication engine
          </Link>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Total notifications</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {workspace.notifications.length}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Items currently tracked in the notification center.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Unread</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {workspace.summary.unreadNotifications}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Alerts that still need review or acknowledgement.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Announcements linked</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {workspace.summary.publishedAnnouncements}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Published announcements that can generate related follow-up notifications.
          </p>
        </SurfaceCard>
      </section>

      <section className="grid gap-4">
        {workspace.notifications.length > 0
          ? workspace.notifications.map((notification) => (
            <SurfaceCard key={notification.id}>
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
                {notification.targetRole
                  ? (
                    <Badge variant="outline">
                      {notification.targetRole}
                    </Badge>
                  )
                  : null}
              </div>
              <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
                {notification.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {notification.body}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <span>Source: {notification.sourceType ?? "System"}</span>
                <span>Created: {new Date(notification.createdAt).toLocaleString("en-IN")}</span>
                {notification.acknowledgedAt
                  ? <span>Acknowledged: {new Date(notification.acknowledgedAt).toLocaleString("en-IN")}</span>
                  : null}
              </div>
            </SurfaceCard>
          ))
          : (
            <EmptyState
              className="min-h-72"
              description="Operational alerts will appear here when the communication engine raises in-app notifications."
              icon={Bell}
              title="No notifications available"
            />
          )}
      </section>
    </div>
  );
}
