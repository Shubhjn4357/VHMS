import type { AppRole } from "@/constants/roles";

import type { AuditLogRecord } from "@/types/audit";

export type DashboardAppointmentEntry = {
  id: string;
  time: string;
  patientName: string;
  doctorName: string;
  status: string;
};

export type DashboardWardStatusEntry = {
  wardId: string;
  wardName: string;
  occupied: number;
  total: number;
  available: number;
  reserved: number;
  cleaning: number;
  blocked: number;
  status: string;
};

export type DashboardCommunicationQueueEntry = {
  channel: string;
  total: number;
  queued: number;
  failed: number;
  delivered: number;
};

export type DashboardOverviewResponse = {
  summary: {
    totalPatients: number;
    activeDoctors: number;
    collectionsToday: number;
    appointmentsCheckedIn: number;
    appointmentsToday: number;
    occupiedBeds: number;
    availableBeds: number;
    totalBeds: number;
    pendingApprovals: number;
    unreadNotifications: number;
  };
  appointmentQueue: DashboardAppointmentEntry[];
  wardStatus: DashboardWardStatusEntry[];
  communicationQueue: DashboardCommunicationQueueEntry[];
  activityFeed: AuditLogRecord[];
  doctorLoad: {
    doctorName: string;
    specialty: string;
    appointmentsToday: number;
    checkedIn: number;
    nextSlot: string | null;
  }[];
};

export type AnalyticsDailyRevenuePoint = {
  date: string;
  billed: number;
  paid: number;
};

export type AnalyticsActionActivity = {
  action: string;
  total: number;
};

export type AnalyticsChannelPerformance = {
  channel: string;
  total: number;
  delivered: number;
  queued: number;
  failed: number;
  deliveryRate: number;
};

export type AnalyticsRoleDistribution = {
  role: AppRole;
  total: number;
};

export type AnalyticsModuleUsage = {
  module: string;
  total: number;
};

export type AnalyticsSignInActivity = {
  label: string;
  total: number;
};

export type AnalyticsSnapshotResponse = {
  summary: {
    totalRevenue: number;
    amountCollected: number;
    outstandingAmount: number;
    deliveryRate: number;
    activeAdmissions: number;
    occupancyRate: number;
    auditEvents: number;
    unreadNotifications: number;
    successfulSignIns: number;
    blockedSignIns: number;
  };
  dailyRevenue: AnalyticsDailyRevenuePoint[];
  actionActivity: AnalyticsActionActivity[];
  moduleUsage: AnalyticsModuleUsage[];
  signInActivity: AnalyticsSignInActivity[];
  channelPerformance: AnalyticsChannelPerformance[];
  roleDistribution: AnalyticsRoleDistribution[];
  occupancyBreakdown: {
    label: string;
    total: number;
  }[];
};

export type RevenueByDoctorRow = {
  doctorId: string | null;
  doctorName: string;
  bills: number;
  totalBilled: number;
  amountCollected: number;
  outstandingAmount: number;
};

export type AppointmentStatusRow = {
  status: string;
  total: number;
};

export type CommunicationChannelRow = {
  channel: string;
  total: number;
  delivered: number;
  queued: number;
  failed: number;
};

export type OccupancyByWardRow = {
  wardId: string;
  wardName: string;
  occupied: number;
  total: number;
  reserved: number;
  cleaning: number;
  blocked: number;
  occupancyRate: number;
};

export type StaffAccessByRoleRow = {
  role: AppRole;
  approved: number;
  pending: number;
  revoked: number;
};

export type OutstandingBillRow = {
  billId: string;
  billNumber: string;
  patientName: string;
  totalAmount: number;
  amountPaid: number;
  balanceAmount: number;
  paymentStatus: string;
};

export type ReportsWorkspaceResponse = {
  summary: {
    totalRevenue: number;
    amountCollected: number;
    outstandingAmount: number;
    activeAdmissions: number;
    queuedMessages: number;
    failedMessages: number;
  };
  revenueByDoctor: RevenueByDoctorRow[];
  appointmentStatus: AppointmentStatusRow[];
  communicationByChannel: CommunicationChannelRow[];
  occupancyByWard: OccupancyByWardRow[];
  staffAccessByRole: StaffAccessByRoleRow[];
  outstandingBills: OutstandingBillRow[];
};
