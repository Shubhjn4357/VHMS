import type { PermissionKey } from "@/constants/permissions";
import type { AppRole } from "@/constants/roles";
import type { StaffAccessStatus } from "@/constants/staffAccessDefaults";

export type StaffAccessRecord = {
  id: string;
  email: string;
  displayName: string;
  role: AppRole;
  status: StaffAccessStatus;
  defaultPermissions: PermissionKey[];
  approvedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string | null;
  userStatus: string | null;
};

export type StaffAccessSummary = {
  total: number;
  approved: number;
  pending: number;
  revoked: number;
  activeUsers: number;
};

export type StaffAccessFilters = {
  q?: string;
  status?: StaffAccessStatus | "ALL";
};

export type StaffAccessListResponse = {
  entries: StaffAccessRecord[];
  summary: StaffAccessSummary;
  filters: {
    q: string;
    status: StaffAccessStatus | "ALL";
  };
};

export type StaffAccessUpsertInput = {
  email: string;
  displayName: string;
  role: AppRole;
  status: StaffAccessStatus;
  defaultPermissions: PermissionKey[];
};

export type StaffAccessUpdateInput =
  & Partial<
    Omit<StaffAccessUpsertInput, "email">
  >
  & {
    id: string;
  };
