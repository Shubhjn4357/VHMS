export { dashboardAppointmentsMetadata as metadata } from "@/app/dashboard/page-metadata";

import dynamic from "next/dynamic";

import { DashboardRouteSkeleton } from "@/components/layout/route-skeletons";
import { PageHeader } from "@/components/ui/page-header";

const AppointmentManagement = dynamic(
  () => import("@/components/appointments/appointment-management").then((mod) => mod.AppointmentManagement),
  {
    loading: () => <DashboardRouteSkeleton variant="directory" />,
  },
);

export default function DashboardAppointmentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Flow"
        title="Appointments"
        description="Run scheduling, queue movement, patient check-in, export, and doctor-day workload control from the dedicated appointments route."
      />
      <AppointmentManagement hideHeader />
    </div>
  );
}
