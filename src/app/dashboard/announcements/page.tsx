import Link from "next/link";
import { Megaphone } from "lucide-react";

import { dashboardAnnouncementsMetadata as metadata } from "@/app/dashboard/page-metadata";
import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { listCommunicationWorkspace } from "@/lib/communications/service";

export { metadata };

export default async function DashboardAnnouncementsPage() {
  const workspace = await listCommunicationWorkspace();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Broadcast center"
        title="Announcements"
        description="Review published and draft announcements, priority levels, audience targeting, and escalation posture from a dedicated page."
        actions={
          <Link className={buttonVariants({ variant: "outline" })} href="/dashboard/communications">
            Open communication engine
          </Link>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Announcements</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {workspace.announcements.length}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Stored operational broadcasts available in the hospital notice workflow.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Published</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {workspace.summary.publishedAnnouncements}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Live announcements visible as published notices.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Unread alerts</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {workspace.summary.unreadNotifications}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Related in-app notification activity still waiting for review.
          </p>
        </SurfaceCard>
      </section>

      <section className="grid gap-4">
        {workspace.announcements.length > 0
          ? workspace.announcements.map((announcement) => (
            <SurfaceCard key={announcement.id}>
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
              </div>
              <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
                {announcement.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
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
            </SurfaceCard>
          ))
          : (
            <EmptyState
              className="min-h-72"
              description="Published and draft announcements will appear here once broadcasts are created."
              icon={Megaphone}
              title="No announcements available"
            />
          )}
      </section>
    </div>
  );
}
