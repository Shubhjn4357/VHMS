export { dashboardSettingsMetadata as metadata } from "@/app/dashboard/page-metadata";

import dynamic from "next/dynamic";

import { DashboardRouteSkeleton } from "@/components/layout/route-skeletons";
import { PageHeader } from "@/components/ui/page-header";

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
      <HospitalProfileManagement hideHeader />
      <FeatureFlagManagement hideHeader />
    </div>
  );
}
