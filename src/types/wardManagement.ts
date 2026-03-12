import type { BedStatus } from "@/constants/bedStatus";

export type WardManagementBedRecord = {
  id: string;
  wardId: string;
  wardName: string;
  roomId: string | null;
  roomNumber: string | null;
  bedNumber: string;
  status: BedStatus;
  patientName: string | null;
  hasActiveAdmission: boolean;
  createdAt: string;
};

export type WardManagementRoomRecord = {
  id: string;
  wardId: string;
  wardName: string;
  roomNumber: string;
  roomType: string;
  dailyCharge: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  createdAt: string;
  beds: WardManagementBedRecord[];
};

export type WardManagementWardRecord = {
  id: string;
  name: string;
  floor: string | null;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  createdAt: string;
  rooms: WardManagementRoomRecord[];
};

export type WardManagementSummary = {
  totalWards: number;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  blockedBeds: number;
};

export type WardManagementFilters = {
  q?: string;
  wardId?: string;
  status?: BedStatus | "ALL";
};

export type WardManagementResponse = {
  entries: WardManagementWardRecord[];
  summary: WardManagementSummary;
  filters: {
    q: string;
    wardId: string | null;
    status: BedStatus | "ALL";
  };
  directories: {
    wards: Array<{
      id: string;
      name: string;
    }>;
    rooms: Array<{
      id: string;
      wardId: string;
      roomNumber: string;
    }>;
  };
};

export type WardUpsertInput = {
  name: string;
  floor?: string;
};

export type WardUpdateInput = Partial<WardUpsertInput> & {
  id: string;
};

export type RoomUpsertInput = {
  wardId: string;
  roomNumber: string;
  roomType: string;
  dailyCharge: number;
};

export type RoomUpdateInput = Partial<RoomUpsertInput> & {
  id: string;
};

export type BedUpsertInput = {
  wardId: string;
  roomId: string;
  bedNumber: string;
  status: Exclude<BedStatus, "OCCUPIED">;
};

export type BedUpdateInput = Partial<BedUpsertInput> & {
  id: string;
};

export type WardManagementDeleteResponse = {
  id: string;
};
