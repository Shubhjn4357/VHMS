export type ClinicalAdmissionLookup = {
  id: string;
  patientId: string;
  patientName: string;
  patientHospitalNumber: string;
  doctorId: string | null;
  doctorName: string | null;
  bedId: string | null;
  bedNumber: string | null;
  roomNumber: string | null;
  wardName: string | null;
  admittedAt: string;
  dischargedAt: string | null;
  status: string;
};
