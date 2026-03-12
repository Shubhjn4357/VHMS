export { dashboardDoctorsMetadata as metadata } from "@/app/dashboard/page-metadata";

import dynamic from "next/dynamic";

import { DashboardRouteSkeleton } from "@/components/layout/route-skeletons";
import { PageHeader } from "@/components/ui/page-header";

const DoctorManagement = dynamic(
  () => import("@/components/doctors/doctor-management").then((mod) => mod.DoctorManagement),
  {
    loading: () => <DashboardRouteSkeleton variant="directory" />,
  },
);

export default function DashboardDoctorsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Master data"
        title="Doctors"
        description="Maintain physician profiles, specialties, departments, consultation pricing, and scheduling availability from the doctor master route."
      />
      <DoctorManagement hideHeader />
    </div>
  );
}
