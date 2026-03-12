import { ROLE_PERMISSIONS } from "@/constants/permissions";
import type { AppRole } from "@/constants/roles";

export const STAFF_ACCESS_STATUS = ["PENDING", "APPROVED", "REVOKED"] as const;

export type StaffAccessStatus = (typeof STAFF_ACCESS_STATUS)[number];

export const STAFF_ACCESS_DEFAULTS: Record<
  AppRole,
  { status: StaffAccessStatus; defaultPermissions: string[] }
> = {
  SUPER_ADMIN: {
    status: "APPROVED",
    defaultPermissions: ROLE_PERMISSIONS.SUPER_ADMIN,
  },
  ADMIN: {
    status: "APPROVED",
    defaultPermissions: ROLE_PERMISSIONS.ADMIN,
  },
  BILLING_STAFF: {
    status: "APPROVED",
    defaultPermissions: ROLE_PERMISSIONS.BILLING_STAFF,
  },
  RECEPTION_STAFF: {
    status: "APPROVED",
    defaultPermissions: ROLE_PERMISSIONS.RECEPTION_STAFF,
  },
  DOCTOR: {
    status: "APPROVED",
    defaultPermissions: ROLE_PERMISSIONS.DOCTOR,
  },
  NURSE: {
    status: "APPROVED",
    defaultPermissions: ROLE_PERMISSIONS.NURSE,
  },
  OPERATOR: {
    status: "APPROVED",
    defaultPermissions: ROLE_PERMISSIONS.OPERATOR,
  },
  ACCOUNT_STAFF: {
    status: "APPROVED",
    defaultPermissions: ROLE_PERMISSIONS.ACCOUNT_STAFF,
  },
  AUDITOR: {
    status: "APPROVED",
    defaultPermissions: ROLE_PERMISSIONS.AUDITOR,
  },
};
