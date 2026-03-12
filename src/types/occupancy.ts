import type { BedStatus } from "@/constants/bedStatus";

export type OccupancyBedRecord = {
  id: string;
  wardId: string;
  wardName: string;
  wardFloor: string | null;
  roomId: string | null;
  roomNumber: string | null;
  roomType: string | null;
  dailyCharge: number | null;
  bedNumber: string;
  status: BedStatus;
  admissionId: string | null;
  patientId: string | null;
  patientName: string | null;
  patientHospitalNumber: string | null;
  doctorId: string | null;
  doctorName: string | null;
  admittedAt: string | null;
};

export type OccupancyRoomRecord = {
  id: string | null;
  wardId: string;
  roomNumber: string | null;
  roomType: string | null;
  dailyCharge: number | null;
  totalBeds: number;
  occupiedBeds: number;
  beds: OccupancyBedRecord[];
};

export type OccupancyWardRecord = {
  id: string;
  name: string;
  floor: string | null;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  rooms: OccupancyRoomRecord[];
};

export type OccupancySummary = {
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  reservedBeds: number;
  cleaningBeds: number;
  maintenanceBeds: number;
  blockedBeds: number;
  activeAdmissions: number;
};

export type OccupancyFilters = {
  q?: string;
  wardId?: string;
  status?: BedStatus | "ALL";
};

export type OccupancyBoardResponse = {
  wards: OccupancyWardRecord[];
  summary: OccupancySummary;
  filters: {
    q: string;
    wardId: string | null;
    status: BedStatus | "ALL";
  };
};

export type OccupancyAssignmentInput = {
  patientId: string;
  bedId: string;
  attendingDoctorId: string;
  admittedAt?: string;
};

export type OccupancyAdmissionActionInput = {
  id: string;
  action: "TRANSFER" | "DISCHARGE";
  targetBedId?: string;
};

export type OccupancyBedStatusUpdateInput = {
  id: string;
  status: BedStatus;
};
