import { asc, desc, eq } from "drizzle-orm";

import type { AppRole } from "@/constants/roles";
import { getDb } from "@/db/client";
import {
  admissions,
  appointments,
  auditLogs,
  beds,
  bills,
  communicationLogs,
  consentDocuments,
  dischargeSummaries,
  doctors,
  messageQueue,
  notificationCenterItems,
  patients,
  staffAccess,
  wards,
} from "@/db/schema";
import { listRecentAuditEntries } from "@/lib/audit/service";
import type {
  AnalyticsActionActivity,
  AnalyticsChannelPerformance,
  AnalyticsDailyRevenuePoint,
  AnalyticsRoleDistribution,
  AnalyticsSnapshotResponse,
  DashboardCommunicationQueueEntry,
  DashboardOverviewResponse,
  DashboardWardStatusEntry,
} from "@/types/analytics";

function formatClock(value: Date) {
  return value.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function endOfToday() {
  const now = startOfToday();
  now.setDate(now.getDate() + 1);
  return now;
}

function getDateBucketKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getModuleLabel(action: string) {
  const [prefix] = action.split(".");

  switch (prefix) {
    case "appointments":
      return "Appointments";
    case "billing":
      return "Billing";
    case "occupancy":
      return "Occupancy";
    case "discharge":
      return "Discharge";
    case "consents":
      return "Consents";
    case "communications":
      return "Communications";
    case "staffAccess":
    case "auth":
      return "Access";
    case "blog":
      return "Blog";
    case "featureFlags":
    case "dashboardLayouts":
    case "printTemplates":
      return "Configuration";
    default:
      return prefix
        ? prefix.charAt(0).toUpperCase() + prefix.slice(1)
        : "Other";
  }
}

function buildWardStatusLabel(
  entry: Omit<
    DashboardWardStatusEntry,
    "status" | "wardId" | "wardName"
  >,
) {
  if (entry.total === 0) {
    return "No beds mapped yet";
  }

  const occupiedRate = entry.occupied / entry.total;

  if (occupiedRate >= 0.85) {
    return "Capacity is nearly full";
  }

  if (entry.cleaning > 0 || entry.blocked > 0) {
    return "Requires cleaning or maintenance follow-up";
  }

  if (entry.reserved > 0) {
    return "Reserved capacity is waiting for arrival";
  }

  return "Beds available for new allocation";
}

function toChannelBreakdown(rows: {
  channel: string;
  status: string;
}[]): DashboardCommunicationQueueEntry[] {
  const grouped = new Map<string, DashboardCommunicationQueueEntry>();

  for (const row of rows) {
    const current = grouped.get(row.channel) ?? {
      channel: row.channel,
      total: 0,
      queued: 0,
      failed: 0,
      delivered: 0,
    };

    current.total += 1;

    if (row.status === "QUEUED") {
      current.queued += 1;
    }

    if (row.status === "FAILED") {
      current.failed += 1;
    }

    if (row.status === "DELIVERED" || row.status === "SENT") {
      current.delivered += 1;
    }

    grouped.set(row.channel, current);
  }

  return Array.from(grouped.values()).sort((left, right) =>
    right.total - left.total
  );
}

export async function listDashboardOverview(): Promise<
  DashboardOverviewResponse
> {
  const db = getDb();
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const [
    appointmentRows,
    billRows,
    patientRows,
    doctorRows,
    bedRows,
    queueRows,
    notificationRows,
    dischargeRows,
    consentRows,
    staffAccessRows,
    activityFeed,
  ] = await Promise.all([
    db
      .select({
        id: appointments.id,
        doctorId: doctors.id,
        scheduledFor: appointments.scheduledFor,
        status: appointments.status,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        doctorName: doctors.fullName,
        doctorSpecialty: doctors.specialty,
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
      .orderBy(asc(appointments.scheduledFor)),
    db
      .select({
        totalAmount: bills.totalAmount,
        amountPaid: bills.amountPaid,
        createdAt: bills.createdAt,
      })
      .from(bills),
    db
      .select({
        id: patients.id,
      })
      .from(patients),
    db
      .select({
        id: doctors.id,
      })
      .from(doctors)
      .where(eq(doctors.active, true)),
    db
      .select({
        wardId: wards.id,
        wardName: wards.name,
        bedStatus: beds.status,
      })
      .from(beds)
      .leftJoin(wards, eq(beds.wardId, wards.id))
      .orderBy(asc(wards.name)),
    db
      .select({
        channel: messageQueue.channel,
        status: messageQueue.status,
      })
      .from(messageQueue),
    db
      .select({
        read: notificationCenterItems.read,
      })
      .from(notificationCenterItems),
    db
      .select({
        status: dischargeSummaries.status,
      })
      .from(dischargeSummaries),
    db
      .select({
        status: consentDocuments.status,
      })
      .from(consentDocuments),
    db
      .select({
        status: staffAccess.status,
      })
      .from(staffAccess),
    listRecentAuditEntries(6),
  ]);

  const todayAppointments = appointmentRows.filter((row) =>
    row.scheduledFor >= todayStart && row.scheduledFor < todayEnd
  );
  const todayBills = billRows.filter((row) =>
    row.createdAt >= todayStart && row.createdAt < todayEnd
  );
  const totalPatients = patientRows.length;
  const activeDoctors = doctorRows.length;
  const occupiedBeds = bedRows.filter((row) => row.bedStatus === "OCCUPIED")
    .length;
  const availableBeds = bedRows.filter((row) => row.bedStatus === "FREE")
    .length;
  const totalBeds = bedRows.length;
  const failedMessages =
    queueRows.filter((row) => row.status === "FAILED").length;
  const pendingDischarge =
    dischargeRows.filter((row) => row.status !== "FINALIZED").length;
  const pendingConsents =
    consentRows.filter((row) => row.status !== "signed").length;
  const pendingStaffAccess =
    staffAccessRows.filter((row) => row.status !== "APPROVED").length;
  const unreadNotifications =
    notificationRows.filter((row) => !row.read).length;

  const wardMap = new Map<string, DashboardWardStatusEntry>();
  const doctorLoadMap = new Map<
    string,
    DashboardOverviewResponse["doctorLoad"][number]
  >();

  for (const row of bedRows) {
    const wardId = row.wardId ?? "unmapped";
    const wardName = row.wardName ?? "Unmapped ward";
    const current = wardMap.get(wardId) ?? {
      wardId,
      wardName,
      occupied: 0,
      total: 0,
      available: 0,
      reserved: 0,
      cleaning: 0,
      blocked: 0,
      status: "",
    };

    current.total += 1;

    if (row.bedStatus === "OCCUPIED") {
      current.occupied += 1;
    } else if (row.bedStatus === "FREE") {
      current.available += 1;
    } else if (row.bedStatus === "RESERVED") {
      current.reserved += 1;
    } else if (row.bedStatus === "CLEANING") {
      current.cleaning += 1;
    } else {
      current.blocked += 1;
    }

    wardMap.set(wardId, current);
  }

  for (const row of todayAppointments) {
    const doctorName = row.doctorName ?? "Unassigned doctor";
    const current = doctorLoadMap.get(doctorName) ?? {
      doctorName,
      specialty: row.doctorSpecialty ?? "General practice",
      appointmentsToday: 0,
      checkedIn: 0,
      nextSlot: null,
    };

    current.appointmentsToday += 1;

    if (row.status === "CHECKED_IN" || row.status === "COMPLETED") {
      current.checkedIn += 1;
    }

    const nextSlot = formatClock(row.scheduledFor);
    if (!current.nextSlot || nextSlot < current.nextSlot) {
      current.nextSlot = nextSlot;
    }

    doctorLoadMap.set(doctorName, current);
  }

  const wardStatus = Array.from(wardMap.values())
    .map((entry) => ({
      ...entry,
      status: buildWardStatusLabel(entry),
    }))
    .sort((left, right) => right.occupied - left.occupied);
  const doctorLoad = Array.from(doctorLoadMap.values())
    .sort((left, right) =>
      right.appointmentsToday - left.appointmentsToday ||
      left.doctorName.localeCompare(right.doctorName)
    )
    .slice(0, 6);

  return {
    summary: {
      totalPatients,
      activeDoctors,
      collectionsToday: todayBills.reduce(
        (sum, entry) => sum + entry.amountPaid,
        0,
      ),
      appointmentsCheckedIn:
        todayAppointments.filter((row) =>
          row.status === "CHECKED_IN" || row.status === "COMPLETED"
        ).length,
      appointmentsToday: todayAppointments.length,
      occupiedBeds,
      availableBeds,
      totalBeds,
      pendingApprovals: pendingDischarge + pendingConsents +
        pendingStaffAccess + failedMessages,
      unreadNotifications,
    },
    appointmentQueue: todayAppointments.slice(0, 6).map((row) => ({
      id: row.id,
      time: formatClock(row.scheduledFor),
      patientName: [row.patientFirstName, row.patientLastName]
        .filter(Boolean)
        .join(" ") || "Unknown patient",
      doctorName: row.doctorName ?? "Unassigned doctor",
      status: row.status.replaceAll("_", " "),
    })),
    wardStatus,
    communicationQueue: toChannelBreakdown(queueRows),
    activityFeed,
    doctorLoad,
  };
}

export async function listAnalyticsSnapshot(): Promise<
  AnalyticsSnapshotResponse
> {
  const db = getDb();
  const today = new Date();
  const buckets = new Map<string, AnalyticsDailyRevenuePoint>();

  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - index);

    buckets.set(getDateBucketKey(date), {
      date: getDateBucketKey(date),
      billed: 0,
      paid: 0,
    });
  }

  const [
    billRows,
    admissionRows,
    bedRows,
    communicationRows,
    auditRows,
    notificationRows,
    staffRows,
  ] = await Promise.all([
    db
      .select({
        totalAmount: bills.totalAmount,
        amountPaid: bills.amountPaid,
        createdAt: bills.createdAt,
      })
      .from(bills),
    db
      .select({
        status: admissions.status,
      })
      .from(admissions),
    db
      .select({
        status: beds.status,
      })
      .from(beds),
    db
      .select({
        channel: communicationLogs.channel,
        status: communicationLogs.status,
      })
      .from(communicationLogs),
    db
      .select({
        action: auditLogs.action,
      })
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt)),
    db
      .select({
        read: notificationCenterItems.read,
      })
      .from(notificationCenterItems),
    db
      .select({
        role: staffAccess.role,
      })
      .from(staffAccess),
  ]);

  for (const bill of billRows) {
    const bucket = buckets.get(getDateBucketKey(bill.createdAt));
    if (!bucket) {
      continue;
    }

    bucket.billed += bill.totalAmount;
    bucket.paid += bill.amountPaid;
  }

  const channelBreakdown = toChannelBreakdown(communicationRows);
  const deliveryRate = channelBreakdown.reduce(
    (sum, entry) => sum + entry.delivered,
    0,
  ) / Math.max(communicationRows.length, 1);

  const actionMap = new Map<string, AnalyticsActionActivity>();
  const moduleMap = new Map<string, number>();

  for (const row of auditRows) {
    const current = actionMap.get(row.action) ?? {
      action: row.action,
      total: 0,
    };
    current.total += 1;
    actionMap.set(row.action, current);
    const moduleLabel = getModuleLabel(row.action);
    moduleMap.set(moduleLabel, (moduleMap.get(moduleLabel) ?? 0) + 1);
  }

  const roleMap = new Map<AppRole, AnalyticsRoleDistribution>();

  for (const row of staffRows) {
    const current = roleMap.get(row.role) ?? {
      role: row.role,
      total: 0,
    };
    current.total += 1;
    roleMap.set(row.role, current);
  }

  const occupancyMap = new Map<string, number>();

  for (const row of bedRows) {
    occupancyMap.set(row.status, (occupancyMap.get(row.status) ?? 0) + 1);
  }

  const successfulSignIns =
    auditRows.filter((row) => row.action === "auth.signIn").length;
  const blockedSignIns =
    auditRows.filter((row) => row.action === "auth.signIn.blocked").length;

  return {
    summary: {
      totalRevenue: billRows.reduce((sum, row) => sum + row.totalAmount, 0),
      amountCollected: billRows.reduce((sum, row) => sum + row.amountPaid, 0),
      outstandingAmount: billRows.reduce(
        (sum, row) => sum + (row.totalAmount - row.amountPaid),
        0,
      ),
      deliveryRate,
      activeAdmissions: admissionRows.filter((row) => row.status === "ADMITTED")
        .length,
      occupancyRate: bedRows.filter((row) => row.status === "OCCUPIED").length /
        Math.max(bedRows.length, 1),
      auditEvents: auditRows.length,
      unreadNotifications: notificationRows.filter((row) => !row.read).length,
      successfulSignIns,
      blockedSignIns,
    },
    dailyRevenue: Array.from(buckets.values()),
    actionActivity: Array.from(actionMap.values())
      .sort((left, right) => right.total - left.total)
      .slice(0, 6),
    moduleUsage: Array.from(moduleMap.entries())
      .map(([module, total]) => ({ module, total }))
      .sort((left, right) => right.total - left.total)
      .slice(0, 6),
    signInActivity: [
      {
        label: "Successful sign-ins",
        total: successfulSignIns,
      },
      {
        label: "Blocked sign-ins",
        total: blockedSignIns,
      },
    ],
    channelPerformance: channelBreakdown.map(
      (entry): AnalyticsChannelPerformance => ({
        channel: entry.channel,
        total: entry.total,
        delivered: entry.delivered,
        queued: entry.queued,
        failed: entry.failed,
        deliveryRate: entry.delivered / Math.max(entry.total, 1),
      }),
    ),
    roleDistribution: Array.from(roleMap.values()).sort((left, right) =>
      right.total - left.total
    ),
    occupancyBreakdown: Array.from(occupancyMap.entries()).map((
      [label, total],
    ) => ({
      label,
      total,
    })),
  };
}
