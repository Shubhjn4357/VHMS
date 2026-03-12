export type DoctorLookupRecord = {
  id: string;
  fullName: string;
  designation: string | null;
  specialty: string | null;
  departmentId: string | null;
  departmentName: string | null;
  consultationFee: number;
  email: string | null;
  phone: string | null;
  signatureUrl: string | null;
  active: boolean;
};

export type DoctorLookupResponse = {
  entries: DoctorLookupRecord[];
};

export type DoctorManagementRecord = DoctorLookupRecord & {
  totalAppointments: number;
  lastAppointmentAt: string | null;
  createdAt: string;
};

export type DoctorManagementResponse = {
  entries: DoctorManagementRecord[];
  summary: {
    total: number;
    active: number;
    inactive: number;
    departments: number;
  };
  directories: {
    departments: Array<{
      id: string;
      name: string;
    }>;
  };
};

export type DoctorManagementInput = {
  fullName: string;
  designation?: string;
  specialty?: string;
  consultationFee: number;
  departmentName?: string;
  email?: string;
  phone?: string;
  signatureUrl?: string;
  active: boolean;
};

export type DoctorUpdateInput = Partial<DoctorManagementInput> & {
  id: string;
};

export type DoctorDeleteResponse = {
  id: string;
};
