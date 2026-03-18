import type { PermissionKey } from "@/constants/permissions";

export type ModuleCard = {
  name: string;
  summary: string;
  status: string;
  accent: string;
};

export type WorkflowStep = {
  step: string;
  title: string;
  detail: string;
};

export type NavGroup = {
  title: string;
  items: {
    label: string;
    href?: string;
    badge?: string;
    permissions?: PermissionKey[];
  }[];
};

export const heroStats = [
  {
    label: "Today arrivals",
    value: "126",
    detail: "OPD, IPD, and scheduled admissions in one command board",
  },
  {
    label: "Avg. bill finalization",
    value: "02:12",
    detail: "Designed for dense, keyboard-first front-desk operations",
  },
  {
    label: "Bed occupancy sync",
    value: "98%",
    detail: "Live ward visibility with move, reserve, and discharge trails",
  },
] as const;

export const workflowSteps: WorkflowStep[] = [
  {
    step: "01",
    title: "Staff access is invite-only",
    detail:
      "Google sign-in is allowed only for approved staff addresses with role and module permissions already assigned.",
  },
  {
    step: "02",
    title: "Reception starts from the patient thread",
    detail:
      "Every appointment, bill, admission, communication, and print action stays attached to one patient timeline.",
  },
  {
    step: "03",
    title: "Operations stay live while records stay strict",
    detail:
      "Occupancy, billing, consents, discharge, and exports are available without loosening audit and validation rules.",
  },
] as const;

export const moduleCards: ModuleCard[] = [
  {
    name: "Appointments and Queue",
    summary:
      "Doctor schedule planning, slot control, front-desk check-in, and queue progression.",
    status: "High throughput",
    accent: "bg-accent/12 text-accent",
  },
  {
    name: "OPD and IPD Billing",
    summary:
      "Dynamic charge templates, doctor mappings, receipts, payment status, and print-safe invoice flows.",
    status: "Financial core",
    accent: "bg-brand/12 text-brand",
  },
  {
    name: "Ward and Bed Occupancy",
    summary:
      "Real-time bed state, admission tracking, transfers, discharge readiness, and movement logs.",
    status: "Live board",
    accent: "bg-success/12 text-success",
  },
  {
    name: "Consent and Discharge",
    summary:
      "Structured medical documents, e-sign capture, sealed consent state, and A4-ready summaries.",
    status: "Clinical workflow",
    accent: "bg-warning/12 text-warning",
  },
  {
    name: "Communication Engine",
    summary:
      "SMS, email, and WhatsApp templates tied to admissions, bills, reminders, and discharge milestones.",
    status: "Automation",
    accent: "bg-accent/12 text-accent",
  },
  {
    name: "Audit and Analytics",
    summary:
      "Permission changes, login history, revenue drill-downs, occupancy trends, and operational dashboards.",
    status: "Governance ready",
    accent: "bg-foreground/6 text-ink",
  },
] as const;

export const navGroups: NavGroup[] = [
  {
    title: "Operations",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        badge: "Live",
        permissions: ["dashboard.view"],
      },
      {
        label: "Patients",
        href: "/dashboard/patients",
        badge: "Live",
        permissions: ["patients.view"],
      },
      {
        label: "OPD",
        href: "/dashboard/opd",
        badge: "Flow",
        permissions: ["appointments.view"],
      },
      {
        label: "Doctors",
        href: "/dashboard/doctors",
        badge: "Live",
        permissions: ["doctors.view"],
      },
      {
        label: "Appointments",
        href: "/dashboard/appointments",
        badge: "Live",
        permissions: ["appointments.view"],
      },
      {
        label: "Billing",
        href: "/dashboard/billing",
        badge: "Live",
        permissions: ["billing.view"],
      },
      {
        label: "Charge Master",
        href: "/dashboard/charge-master",
        badge: "Core",
        permissions: ["billing.view"],
      },
      {
        label: "Rooms",
        href: "/dashboard/rooms",
        badge: "Live",
        permissions: ["wards.view"],
      },
      {
        label: "Wards & Beds",
        href: "/dashboard/wards",
        badge: "Live",
        permissions: ["wards.view"],
      },
    ],
  },
  {
    title: "Clinical",
    items: [
      {
        label: "IPD",
        href: "/dashboard/ipd",
        badge: "Flow",
        permissions: ["occupancy.view"],
      },
      {
        label: "Occupancy",
        href: "/dashboard/occupancy",
        badge: "Live",
        permissions: ["occupancy.view"],
      },
      {
        label: "Discharge Summaries",
        href: "/dashboard/discharge-summaries",
        badge: "Live",
        permissions: ["discharge.view"],
      },
      {
        label: "Discharge",
        href: "/dashboard/discharge",
        badge: "Live",
        permissions: ["discharge.view"],
      },
      {
        label: "Consents",
        href: "/dashboard/consents",
        badge: "Live",
        permissions: ["consents.view"],
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        label: "Staff",
        href: "/dashboard/staff",
        badge: "Live",
        permissions: ["staffAccess.view"],
      },
      {
        label: "Staff Access",
        href: "/dashboard/staff-access",
        badge: "Invite-only",
        permissions: ["staffAccess.view"],
      },
      {
        label: "Announcements",
        href: "/dashboard/announcements",
        badge: "Live",
        permissions: ["communications.view"],
      },
      {
        label: "Notifications",
        href: "/dashboard/notifications",
        badge: "Live",
        permissions: ["communications.view"],
      },
      {
        label: "Communications",
        href: "/dashboard/communications",
        badge: "Live",
        permissions: ["communications.view"],
      },
      {
        label: "Print Templates",
        href: "/dashboard/print-templates",
        badge: "Live",
        permissions: ["settings.view"],
      },
      {
        label: "Reports",
        href: "/dashboard/reports",
        badge: "Live",
        permissions: ["reports.view"],
      },
      {
        label: "Analytics",
        href: "/dashboard/analytics",
        badge: "Live",
        permissions: ["analytics.view"],
      },
      {
        label: "Audit Logs",
        href: "/dashboard/audit-logs",
        badge: "Live",
        permissions: ["audit.view"],
      },
      {
        label: "Settings",
        href: "/dashboard/settings",
        badge: "Live",
        permissions: ["settings.view"],
      },
      {
        label: "Profile",
        href: "/dashboard/profile",
        badge: "Account",
        permissions: ["dashboard.view"],
      },
      {
        label: "Blog CMS",
        href: "/dashboard/blog",
        badge: "Live",
        permissions: ["blog.view"],
      },
    ],
  },
] as const;

export const dashboardMetrics = [
  {
    label: "Daily collections",
    value: "Rs 2.84L",
    trend: "+12.4%",
    tone: "text-brand",
  },
  {
    label: "Appointments checked in",
    value: "84 / 126",
    trend: "67% completed",
    tone: "text-accent",
  },
  {
    label: "Beds occupied",
    value: "73 / 96",
    trend: "76% utilization",
    tone: "text-warning",
  },
  {
    label: "Approvals waiting",
    value: "11",
    trend: "2 discharge summaries blocked",
    tone: "text-danger",
  },
] as const;

export const dashboardAppointments = [
  {
    time: "09:15",
    patient: "Ritika Sharma",
    doctor: "Dr. A. Verma",
    status: "Checked in",
  },
  {
    time: "09:30",
    patient: "Nasir Khan",
    doctor: "Dr. P. Gupta",
    status: "Token generated",
  },
  {
    time: "09:50",
    patient: "Aviral Soni",
    doctor: "Dr. N. Rathi",
    status: "Billing pending",
  },
  {
    time: "10:10",
    patient: "Leena Patel",
    doctor: "Dr. R. Iyer",
    status: "Confirmed",
  },
] as const;

export const wardStatus = [
  { ward: "ICU", occupied: 10, total: 12, status: "Critical care near full" },
  { ward: "Ward A", occupied: 22, total: 28, status: "Steady occupancy" },
  { ward: "Ward B", occupied: 18, total: 24, status: "6 discharge-ready beds" },
  {
    ward: "Private",
    occupied: 23,
    total: 32,
    status: "Available for admissions",
  },
] as const;

export const communicationQueue = [
  {
    title: "Appointment reminders",
    channel: "SMS",
    volume: "46 queued",
  },
  {
    title: "Billing receipt dispatch",
    channel: "Email",
    volume: "18 sent",
  },
  {
    title: "Discharge instructions",
    channel: "WhatsApp",
    volume: "7 awaiting approval",
  },
] as const;

export const activityFeed = [
  "Admin revised OPD follow-up charge template for Cardiology.",
  "Nurse station acknowledged Ward B cleaning status change.",
  "Staff access invite approved for billing.kiosk@hospital.in.",
  "Discharge summary finalized for IPD-24-0318 after doctor sign-off.",
] as const;
