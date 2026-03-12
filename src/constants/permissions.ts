import type { AppRole } from "@/constants/roles";

const dashboardPermissions = [
  "dashboard.view",
  "dashboard.configure",
] as const;

const patientPermissions = [
  "patients.view",
  "patients.create",
  "patients.update",
] as const;

const appointmentPermissions = [
  "appointments.view",
  "appointments.create",
  "appointments.update",
  "appointments.checkIn",
] as const;

const doctorPermissions = [
  "doctors.view",
  "doctors.manage",
] as const;

const billingPermissions = [
  "billing.view",
  "billing.create",
  "billing.finalize",
  "billing.refund",
  "billing.export",
] as const;

const wardPermissions = [
  "wards.view",
  "wards.manage",
] as const;

const clinicalPermissions = [
  "occupancy.view",
  "occupancy.manage",
  "discharge.view",
  "discharge.create",
  "consents.view",
  "consents.create",
  "consents.finalize",
] as const;

const adminPermissions = [
  "staffAccess.view",
  "staffAccess.manage",
  "settings.view",
  "settings.manage",
  "reports.view",
  "reports.export",
  "analytics.view",
  "audit.view",
  "communications.view",
  "communications.send",
  "blog.view",
  "blog.manage",
] as const;

export const ALL_PERMISSIONS = [
  ...dashboardPermissions,
  ...patientPermissions,
  ...appointmentPermissions,
  ...doctorPermissions,
  ...billingPermissions,
  ...wardPermissions,
  ...clinicalPermissions,
  ...adminPermissions,
] as const;

export type PermissionKey = (typeof ALL_PERMISSIONS)[number];

export const PERMISSION_GROUPS = {
  dashboard: dashboardPermissions,
  patients: patientPermissions,
  appointments: appointmentPermissions,
  doctors: doctorPermissions,
  billing: billingPermissions,
  wards: wardPermissions,
  clinical: clinicalPermissions,
  administration: adminPermissions,
} as const;

export const ROLE_PERMISSIONS: Record<AppRole, PermissionKey[]> = {
  SUPER_ADMIN: [...ALL_PERMISSIONS],
  ADMIN: [
    ...dashboardPermissions,
    ...patientPermissions,
    ...appointmentPermissions,
    ...doctorPermissions,
    ...billingPermissions,
    ...wardPermissions,
    ...clinicalPermissions,
    ...adminPermissions,
  ],
  BILLING_STAFF: [
    ...dashboardPermissions,
    "patients.view",
    "patients.create",
    "patients.update",
    "appointments.view",
    "doctors.view",
    "billing.view",
    "billing.create",
    "billing.finalize",
    "billing.export",
    "communications.view",
  ],
  RECEPTION_STAFF: [
    ...dashboardPermissions,
    "patients.view",
    "patients.create",
    "patients.update",
    "appointments.view",
    "doctors.view",
    "appointments.create",
    "appointments.update",
    "appointments.checkIn",
    "wards.view",
    "occupancy.view",
    "billing.view",
    "billing.create",
    "communications.view",
  ],
  DOCTOR: [
    ...dashboardPermissions,
    "patients.view",
    "appointments.view",
    "doctors.view",
    "wards.view",
    "discharge.view",
    "discharge.create",
    "consents.view",
  ],
  NURSE: [
    ...dashboardPermissions,
    "patients.view",
    "appointments.view",
    "doctors.view",
    "wards.view",
    "occupancy.view",
    "occupancy.manage",
    "consents.view",
  ],
  OPERATOR: [
    ...dashboardPermissions,
    "patients.view",
    "appointments.view",
    "appointments.checkIn",
    "communications.view",
    "communications.send",
  ],
  ACCOUNT_STAFF: [
    ...dashboardPermissions,
    "billing.view",
    "billing.export",
    "reports.view",
    "reports.export",
    "analytics.view",
  ],
  AUDITOR: [
    ...dashboardPermissions,
    "reports.view",
    "analytics.view",
    "audit.view",
  ],
};
