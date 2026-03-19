import Link from "next/link";

import { auth } from "@/auth";
import { dashboardProfileMetadata as metadata } from "@/app/dashboard/page-metadata";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { ROLE_LABELS } from "@/constants/roles";

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

      <section className="grid gap-4 lg:grid-cols-3">
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Identity</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">
            {user?.name ?? "Approved user"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {user?.email ?? "Email not available"}
          </p>
          <Badge className="mt-4 w-fit" variant="outline">
            {user?.role ? ROLE_LABELS[user.role] : "Role unavailable"}
          </Badge>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Permission count</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {permissions.length}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            These permissions drive route visibility, page access, and action-level controls.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Session status</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">Authenticated</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            This route is protected and only available after successful invite-only sign-in.
          </p>
        </SurfaceCard>
      </section>

      <SurfaceCard>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          Granted permissions
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {permissions.map((permission) => (
            <span
              className="management-selection-pill px-3 py-2 text-xs font-medium text-muted-foreground"
              key={permission}
            >
              {permission}
            </span>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}
