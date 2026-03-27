export { dashboardPatientCreateMetadata as metadata } from "@/app/dashboard/page-metadata";

import Link from "next/link";
import dynamic from "next/dynamic";

import { DashboardRouteSkeleton } from "@/components/layout/route-skeletons";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

const PatientManagement = dynamic(
  () => import("@/components/patients/patient-management").then((mod) => mod.PatientManagement),
  {
    loading: () => <DashboardRouteSkeleton variant="form" />,
  },
);

export default function DashboardPatientRegistrationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Full runtime"
        title="Register patient"
        description="Use the dedicated registration route when reception needs the full form workspace without the surrounding directory layout."
        actions={
          <Link
            className={buttonVariants({ variant: "outline" })}
            href="/dashboard/patients"
          >
            Back to patient directory
          </Link>
        }
      />
      <div className="[&_.patient-page-header]:hidden [&_.patient-summary-grid]:hidden [&_.patient-directory-panel]:hidden [&_.patient-main-grid]:block [&_.patient-form-panel]:mx-auto [&_.patient-form-panel]:max-w-4xl">
        <PatientManagement defaultCreateOpen />
      </div>
    </div>
  );
}
