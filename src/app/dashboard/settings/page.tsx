export { dashboardSettingsMetadata as metadata } from "@/app/dashboard/page-metadata";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Building2, Flag, Printer, ShieldCheck } from "lucide-react";

import { DashboardRouteSkeleton } from "@/components/layout/route-skeletons";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";

const FeatureFlagManagement = dynamic(
  () => import("@/components/settings/feature-flag-management").then((mod) => mod.FeatureFlagManagement),
  {
    loading: () => <DashboardRouteSkeleton variant="workspace" />,
  },
);
const HospitalProfileManagement = dynamic(
  () => import("@/components/settings/hospital-profile-management").then((mod) => mod.HospitalProfileManagement),
  {
    loading: () => <DashboardRouteSkeleton variant="workspace" />,
  },
);

export default function DashboardSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Settings"
        description="Control hospital branding, print identity, feature flags, staged rollout posture, and environment-visible configuration overrides from the protected settings route."
      />

      <section className="grid gap-4 xl:grid-cols-4">
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Brand identity</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">1</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Hospital name, logo, contact profile, and letterhead data.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Rollout controls</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">1</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Feature flags, staged activation, environment locks, and role targeting.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Related admin routes</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">2</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Print templates and staff access stay one click away from the settings hub.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Route purpose</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Admin</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Protected control room for branding, rollout policy, and operational configuration.
          </p>
        </SurfaceCard>
      </section>

      <SurfaceCard>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Settings control center
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              Move between identity, rollout policy, and adjacent admin work without losing context
            </h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Use the jump actions below to move directly to hospital branding or feature flags,
              or step out to the connected print and access administration routes.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a className={buttonVariants({ size: "sm", variant: "outline" })} href="#hospital-profile">
              <Building2 className="h-4 w-4" />
              Hospital profile
            </a>
            <a className={buttonVariants({ size: "sm", variant: "outline" })} href="#feature-flags">
              <Flag className="h-4 w-4" />
              Feature flags
            </a>
            <Link className={buttonVariants({ size: "sm", variant: "outline" })} href="/dashboard/print-templates">
              <Printer className="h-4 w-4" />
              Print templates
            </Link>
            <Link className={buttonVariants({ size: "sm", variant: "outline" })} href="/dashboard/staff-access">
              <ShieldCheck className="h-4 w-4" />
              Staff access
            </Link>
          </div>
        </div>
      </SurfaceCard>

      <section className="space-y-4" id="hospital-profile">
        <SurfaceCard>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Identity workspace
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Hospital branding, public details, and print-safe profile
          </h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            This section controls the organization identity that appears across the public site,
            print outputs, and patient-facing communication assets.
          </p>
        </SurfaceCard>
        <HospitalProfileManagement hideHeader />
      </section>

      <section className="space-y-4" id="feature-flags">
        <SurfaceCard>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Rollout workspace
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Feature activation, staged release posture, and environment visibility
          </h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            This section governs operational feature rollout, role targeting, draft-change review,
            and environment-locked configuration state.
          </p>
        </SurfaceCard>
        <FeatureFlagManagement hideHeader />
      </section>
    </div>
  );
}
