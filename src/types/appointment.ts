import type { AppointmentStatus } from "@/constants/appointmentStatus";
import type { AppointmentVisitType } from "@/constants/appointmentVisitType";

export type AppointmentRecord = {
  id: string;
  patientId: string;
  patientName: string;
  patientHospitalNumber: string;
  doctorId: string;
  doctorName: string;
  doctorConsultationFee: number;
  doctorDepartment: string | null;
  scheduledFor: string;
  visitType: AppointmentVisitType;
  queueNumber: number | null;
  status: AppointmentStatus;
  notes: string | null;
  checkedInAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentFilters = {
  q?: string;
  status?: AppointmentStatus | "ALL";
};

export type AppointmentSummary = {
  total: number;
  upcoming: number;
  checkedIn: number;
  completed: number;
  cancelled: number;
};

export type AppointmentListResponse = {
  entries: AppointmentRecord[];
  summary: AppointmentSummary;
  filters: {
    q: string;
    status: AppointmentStatus | "ALL";
  };
};

export type AppointmentUpsertInput = {
  patientId: string;
  doctorId: string;
  scheduledFor: string;
  visitType: AppointmentVisitType;
  status: AppointmentStatus;
  notes?: string;
};

export type AppointmentUpdateInput = Partial<AppointmentUpsertInput> & {
  id: string;
};

export type AppointmentDeleteResponse = {
  id: string;
  deleted: true;
};
