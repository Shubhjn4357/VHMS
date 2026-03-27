import Link from "next/link";

import { dashboardNotificationsMetadata as metadata } from "@/app/dashboard/page-metadata";
import { NotificationCenter } from "@/components/communications/notification-center";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
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

      <NotificationCenter
        notifications={workspace.notifications}
        summary={workspace.summary}
      />
    </div>
  );
}
