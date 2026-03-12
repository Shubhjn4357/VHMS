export type OpdVisitRow = {
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientHospitalNumber: string;
  doctorId: string;
  doctorName: string;
  doctorDepartment: string | null;
  scheduledFor: string;
  status: string;
  visitType: string;
  billId: string | null;
  billNumber: string | null;
  billStatus: string | null;
  paymentStatus: string | null;
  balanceAmount: number | null;
};

export type IpdAdmissionRow = {
  admissionId: string;
  patientId: string;
  patientName: string;
  patientHospitalNumber: string;
  doctorName: string | null;
  wardName: string | null;
  roomNumber: string | null;
  bedNumber: string | null;
  admittedAt: string;
  dischargeSummaryStatus: string | null;
  consentPending: number;
};

export type OpdWorkspaceResponse = {
  summary: {
    scheduledToday: number;
    checkedInToday: number;
    completedToday: number;
    waitingForBilling: number;
    unpaidOpdBills: number;
  };
  todayVisits: OpdVisitRow[];
  recentPatients: Array<{
    id: string;
    fullName: string;
    hospitalNumber: string;
    createdAt: string;
  }>;
};

export type IpdWorkspaceResponse = {
  summary: {
    activeAdmissions: number;
    occupiedBeds: number;
    availableBeds: number;
    pendingDischargeSummaries: number;
    pendingConsents: number;
  };
  activeAdmissions: IpdAdmissionRow[];
  recentDischargeDrafts: Array<{
    id: string;
    patientName: string;
    patientHospitalNumber: string;
    status: string;
    updatedAt: string;
  }>;
  pendingConsentDocuments: Array<{
    id: string;
    patientName: string;
    patientHospitalNumber: string;
    templateName: string;
    status: string;
    updatedAt: string;
  }>;
};
