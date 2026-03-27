export { dashboardAppointmentCreateMetadata as metadata } from "@/app/dashboard/page-metadata";

import Link from "next/link";
import dynamic from "next/dynamic";

import { DashboardRouteSkeleton } from "@/components/layout/route-skeletons";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

const AppointmentManagement = dynamic(
  () => import("@/components/appointments/appointment-management").then((mod) => mod.AppointmentManagement),
  {
    loading: () => <DashboardRouteSkeleton variant="form" />,
  },
);

export default function DashboardAppointmentCreatePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Full runtime"
        title="Schedule appointment"
        description="Use the dedicated scheduling route when the front desk needs the booking form on its own page with more room for patient, doctor, and queue details."
        actions={
          <Link
            className={buttonVariants({ variant: "outline" })}
            href="/dashboard/appointments"
          >
            Back to appointments
          </Link>
        }
      />
      <div className="[&_.appointment-page-header]:hidden [&_.appointment-summary-grid]:hidden [&_.appointment-queue-panel]:hidden [&_.appointment-doctors-panel]:hidden [&_.appointment-main-grid]:block [&_.appointment-form-panel]:mx-auto [&_.appointment-form-panel]:max-w-5xl">
        <AppointmentManagement defaultCreateOpen />
      </div>
    </div>
  );
}
