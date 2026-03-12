import { buildDashboardMetadata } from "@/lib/seo/metadata";

export const dashboardOverviewMetadata = buildDashboardMetadata({
  title: "Dashboard",
  description:
    "Protected hospital operations overview with live KPIs for appointments, billing, occupancy, communications, and approvals.",
  path: "/dashboard",
});

export const dashboardPatientsMetadata = buildDashboardMetadata({
  title: "Patients",
  description:
    "Protected patient master route for registration, search, export, bulk actions, and linked workflow operations.",
  path: "/dashboard/patients",
});

export const dashboardPatientCreateMetadata = buildDashboardMetadata({
  title: "Register Patient",
  description:
    "Protected patient registration workspace for front-desk intake and runtime profile creation.",
  path: "/dashboard/patients/new",
});

export const dashboardDoctorsMetadata = buildDashboardMetadata({
  title: "Doctors",
  description:
    "Protected doctor master route for specialties, consultation fees, status control, bulk actions, and export workflows.",
  path: "/dashboard/doctors",
});

export const dashboardAppointmentsMetadata = buildDashboardMetadata({
  title: "Appointments",
  description:
    "Protected appointment scheduling and queue management route with bulk status control, exports, and OPD coordination.",
  path: "/dashboard/appointments",
});

export const dashboardAppointmentCreateMetadata = buildDashboardMetadata({
  title: "Create Appointment",
  description:
    "Protected appointment creation workspace for scheduling doctor visits and capturing front-desk intake details.",
  path: "/dashboard/appointments/new",
});

export const dashboardOpdMetadata = buildDashboardMetadata({
  title: "OPD Workflow",
  description:
    "Protected outpatient workflow route linking reception, patient intake, appointment scheduling, and OPD billing actions.",
  path: "/dashboard/opd",
});

export const dashboardIpdMetadata = buildDashboardMetadata({
  title: "IPD Workflow",
  description:
    "Protected inpatient workflow route linking occupancy, ward assignment, discharge, consent, and admission operations.",
  path: "/dashboard/ipd",
});

export const dashboardBillingMetadata = buildDashboardMetadata({
  title: "Billing",
  description:
    "Protected billing route for charge master, invoice register, settlement tracking, and export-ready hospital billing operations.",
  path: "/dashboard/billing",
});

export const dashboardBillingCreateMetadata = buildDashboardMetadata({
  title: "Create Invoice",
  description:
    "Protected invoice workspace for building OPD and hospital billing drafts against live patients and charges.",
  path: "/dashboard/billing/create",
});

export const dashboardBillingCheckoutMetadata = buildDashboardMetadata({
  title: "Checkout Desk",
  description:
    "Protected billing checkout route for finalizing invoices, collecting payment, and completing front-desk settlement.",
  path: "/dashboard/billing/checkout",
});

export const dashboardChargeMasterMetadata = buildDashboardMetadata({
  title: "Charge Master",
  description:
    "Protected charge catalog route for pricing control, billing setup, export, and bulk administration.",
  path: "/dashboard/charge-master",
});

export const dashboardWardsMetadata = buildDashboardMetadata({
  title: "Wards and Beds",
  description:
    "Protected ward, room, and bed master route with bulk operations, search, export, and occupancy-linked administration.",
  path: "/dashboard/wards",
});

export const dashboardRoomsMetadata = buildDashboardMetadata({
  title: "Rooms",
  description:
    "Protected hospital room management route tied to ward inventory, bed mapping, charge configuration, and occupancy operations.",
  path: "/dashboard/rooms",
});

export const dashboardOccupancyMetadata = buildDashboardMetadata({
  title: "Occupancy",
  description:
    "Protected live occupancy board for admissions, bed assignment, transfers, discharges, and IPD coordination.",
  path: "/dashboard/occupancy",
});

export const dashboardDischargeMetadata = buildDashboardMetadata({
  title: "Discharge",
  description:
    "Protected discharge workflow route for summary drafting, finalization, and print-safe hospital discharge output.",
  path: "/dashboard/discharge",
});

export const dashboardDischargeSummariesMetadata = buildDashboardMetadata({
  title: "Discharge Summaries",
  description:
    "Protected discharge summary route for hospital document authoring, revision tracking, and export-safe finalization.",
  path: "/dashboard/discharge-summaries",
});

export const dashboardConsentsMetadata = buildDashboardMetadata({
  title: "Consents",
  description:
    "Protected consent management route for hospital forms, signature workflow, and print-ready consent documents.",
  path: "/dashboard/consents",
});

export const dashboardCommunicationsMetadata = buildDashboardMetadata({
  title: "Communications",
  description:
    "Protected communication engine route for templates, queue logs, notifications, announcements, and outbound hospital messaging.",
  path: "/dashboard/communications",
});

export const dashboardAnnouncementsMetadata = buildDashboardMetadata({
  title: "Announcements",
  description:
    "Protected hospital announcement route for pinned updates, priority broadcasts, targeting, and published notice review.",
  path: "/dashboard/announcements",
});

export const dashboardNotificationsMetadata = buildDashboardMetadata({
  title: "Notifications",
  description:
    "Protected notification center route for in-app alerts, acknowledgement tracking, and operational follow-up.",
  path: "/dashboard/notifications",
});

export const dashboardStaffMetadata = buildDashboardMetadata({
  title: "Staff",
  description:
    "Protected staff operations route covering staff access posture, role distribution, and hospital admin visibility.",
  path: "/dashboard/staff",
});

export const dashboardStaffAccessMetadata = buildDashboardMetadata({
  title: "Staff Access",
  description:
    "Protected invite-only staff access route for role assignment, status control, permission overrides, and Google identity approval.",
  path: "/dashboard/staff-access",
});

export const dashboardPrintTemplatesMetadata = buildDashboardMetadata({
  title: "Print Templates",
  description:
    "Protected print template route for A4 and thermal document ordering, visual control, and print output configuration.",
  path: "/dashboard/print-templates",
});

export const dashboardReportsMetadata = buildDashboardMetadata({
  title: "Reports",
  description:
    "Protected reporting route for operational exports, category reporting, staff access posture, and finance review.",
  path: "/dashboard/reports",
});

export const dashboardAnalyticsMetadata = buildDashboardMetadata({
  title: "Analytics",
  description:
    "Protected analytics route for revenue, occupancy, communications, sign-in, role distribution, and audit activity insights.",
  path: "/dashboard/analytics",
});

export const dashboardAuditLogsMetadata = buildDashboardMetadata({
  title: "Audit Logs",
  description:
    "Protected audit route for login, billing, permission, and administrative activity trail review.",
  path: "/dashboard/audit-logs",
});

export const dashboardBlogMetadata = buildDashboardMetadata({
  title: "Blog CMS",
  description:
    "Protected content route for drafting, publishing, and managing the public hospital product journal.",
  path: "/dashboard/blog",
});

export const dashboardSettingsMetadata = buildDashboardMetadata({
  title: "Settings",
  description:
    "Protected admin settings route for feature flags, configuration review, and governance-related controls.",
  path: "/dashboard/settings",
});

export const dashboardProfileMetadata = buildDashboardMetadata({
  title: "Profile",
  description:
    "Protected account route for viewing the signed-in user identity, role, and current operational permissions.",
  path: "/dashboard/profile",
});

export const dashboardPrintBillA4Metadata = buildDashboardMetadata({
  title: "A4 Bill Print",
  description:
    "Protected A4 billing print route for export-safe invoice output.",
  path: "/dashboard/print/bills",
});

export const dashboardPrintBillThermalMetadata = buildDashboardMetadata({
  title: "Thermal Bill Print",
  description:
    "Protected thermal billing print route for receipt-style invoice output.",
  path: "/dashboard/print/bills",
});

export const dashboardPrintConsentMetadata = buildDashboardMetadata({
  title: "Consent Print",
  description:
    "Protected consent print route for signature-ready and archive-safe document output.",
  path: "/dashboard/print/consents",
});

export const dashboardPrintDischargeMetadata = buildDashboardMetadata({
  title: "Discharge Print",
  description:
    "Protected discharge print route for A4-ready summary output.",
  path: "/dashboard/print/discharge",
});
