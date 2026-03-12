import Link from "next/link";

import { dashboardAnnouncementsMetadata as metadata } from "@/app/dashboard/page-metadata";
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
        {workspace.announcements.map((announcement) => (
          <SurfaceCard key={announcement.id}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="glass-chip rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                {announcement.status}
              </span>
              <span className="glass-chip rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                {announcement.priority}
              </span>
              {announcement.pinned
                ? (
                  <span className="glass-chip rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-warning">
                    Pinned
                  </span>
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
                  className="glass-chip rounded-full px-3 py-2 text-xs font-medium text-ink-soft"
                  key={target.id}
                >
                  {target.targetType}
                  {target.targetValue ? `: ${target.targetValue}` : ""}
                </span>
              ))}
            </div>
          </SurfaceCard>
        ))}
      </section>
    </div>
  );
}
