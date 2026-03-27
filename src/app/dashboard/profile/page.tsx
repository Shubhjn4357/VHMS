import Link from "next/link";

import { auth } from "@/auth";
import { dashboardProfileMetadata as metadata } from "@/app/dashboard/page-metadata";
import { ProfilePermissionsCenter } from "@/components/auth/profile-permissions-center";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export { metadata };

export default async function DashboardProfilePage() {
  const session = await auth();
  const user = session?.user;
  const permissions = user?.permissions ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Profile and permissions"
        description="Review the signed-in operational identity, role, and current permission surface that is active in the dashboard."
        actions={
          <>
            <Link className={buttonVariants({ variant: "outline" })} href="/dashboard/staff-access">
              Staff access
            </Link>
            <Link className={buttonVariants({ variant: "outline" })} href="/dashboard/settings">
              Settings
            </Link>
          </>
        }
      />

      <ProfilePermissionsCenter
        email={user?.email ?? null}
        name={user?.name ?? null}
        permissions={permissions}
        role={user?.role ?? null}
      />
    </div>
  );
}
