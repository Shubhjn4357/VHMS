import Link from "next/link";

import { dashboardAnnouncementsMetadata as metadata } from "@/app/dashboard/page-metadata";
import { AnnouncementCenter } from "@/components/communications/announcement-center";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
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

      <AnnouncementCenter
        announcements={workspace.announcements}
        summary={workspace.summary}
      />
    </div>
  );
}
