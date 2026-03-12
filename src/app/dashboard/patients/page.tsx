export { dashboardPatientsMetadata as metadata } from "@/app/dashboard/page-metadata";

import dynamic from "next/dynamic";

import { DashboardRouteSkeleton } from "@/components/layout/route-skeletons";
import { PageHeader } from "@/components/ui/page-header";

const PatientManagement = dynamic(
  () => import("@/components/patients/patient-management").then((mod) => mod.PatientManagement),
  {
    loading: () => <DashboardRouteSkeleton variant="directory" />,
  },
);

export default function DashboardPatientsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Patients"
        description="Register, review, export, and manage the patient master directory that every appointment, bill, admission, consent, and discharge flow depends on."
      />
      <PatientManagement hideHeader />
    </div>
  );
}
