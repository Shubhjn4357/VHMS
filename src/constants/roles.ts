export const APP_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "BILLING_STAFF",
  "RECEPTION_STAFF",
  "DOCTOR",
  "NURSE",
  "OPERATOR",
  "ACCOUNT_STAFF",
  "AUDITOR",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  BILLING_STAFF: "Billing Staff",
  RECEPTION_STAFF: "Reception Staff",
  DOCTOR: "Doctor",
  NURSE: "Nurse",
  OPERATOR: "Operator",
  ACCOUNT_STAFF: "Account Staff",
  AUDITOR: "Auditor",
};

export const PRIVILEGED_ROLES: AppRole[] = ["SUPER_ADMIN", "ADMIN"];
