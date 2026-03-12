import { and, eq, gte, lt } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  appointments,
  beds,
  blogPosts,
  doctors,
  messageQueue,
  patients,
  rooms,
  staffAccess,
  wards,
} from "@/db/schema";
import { listDashboardOverview } from "@/lib/analytics/service";
import { listPublicBlogPosts } from "@/lib/blog/service";
import { getHospitalBranding } from "@/lib/hospital/service";

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

function formatClock(value: Date) {
  return value.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export type PublicDoctorLoadEntry = {
  doctorName: string;
  specialty: string;
  appointmentsToday: number;
  checkedIn: number;
  nextSlot: string | null;
};

export type PublicLandingSnapshot = {
  hospital: Awaited<ReturnType<typeof getHospitalBranding>>;
  metrics: {
    totalPatients: number;
    activeDoctors: number;
    activeStaff: number;
    totalWards: number;
    totalRooms: number;
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
    queuedMessages: number;
    publishedPosts: number;
  };
  operations: Awaited<ReturnType<typeof listDashboardOverview>>;
  doctorLoad: PublicDoctorLoadEntry[];
  recentPosts: Awaited<ReturnType<typeof listPublicBlogPosts>>;
};

export async function getPublicLandingSnapshot(): Promise<PublicLandingSnapshot> {
  const db = getDb();
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const [
    hospital,
    operations,
    recentPosts,
    patientRows,
    doctorRows,
    staffRows,
    wardRows,
    roomRows,
    bedRows,
    messageRows,
    todayAppointments,
    publishedRows,
  ] = await Promise.all([
    getHospitalBranding(),
    listDashboardOverview(),
    listPublicBlogPosts(),
    db.select({ id: patients.id }).from(patients),
    db
      .select({
        id: doctors.id,
      })
      .from(doctors)
      .where(eq(doctors.active, true)),
    db
      .select({
        id: staffAccess.id,
      })
      .from(staffAccess)
      .where(eq(staffAccess.status, "APPROVED")),
    db.select({ id: wards.id }).from(wards),
    db.select({ id: rooms.id }).from(rooms),
    db.select({ id: beds.id, status: beds.status }).from(beds),
    db.select({ status: messageQueue.status }).from(messageQueue),
    db
      .select({
        doctorName: doctors.fullName,
        specialty: doctors.specialty,
        scheduledFor: appointments.scheduledFor,
        status: appointments.status,
      })
      .from(appointments)
      .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
      .where(
        and(
          gte(appointments.scheduledFor, todayStart),
          lt(appointments.scheduledFor, todayEnd),
        ),
      ),
    db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(eq(blogPosts.status, "PUBLISHED")),
  ]);

  const doctorLoadMap = new Map<string, PublicDoctorLoadEntry>();

  for (const appointment of todayAppointments) {
    const key = appointment.doctorName ?? "Unassigned doctor";
    const current = doctorLoadMap.get(key) ?? {
      doctorName: key,
      specialty: appointment.specialty ?? "General practice",
      appointmentsToday: 0,
      checkedIn: 0,
      nextSlot: null,
    };

    current.appointmentsToday += 1;

    if (
      appointment.status === "CHECKED_IN" ||
      appointment.status === "COMPLETED"
    ) {
      current.checkedIn += 1;
    }

    const formattedSlot = formatClock(appointment.scheduledFor);

    if (!current.nextSlot || formattedSlot < current.nextSlot) {
      current.nextSlot = formattedSlot;
    }

    doctorLoadMap.set(key, current);
  }

  const doctorLoad = Array.from(doctorLoadMap.values())
    .sort((left, right) =>
      right.appointmentsToday - left.appointmentsToday ||
      left.doctorName.localeCompare(right.doctorName)
    )
    .slice(0, 4);

  return {
    hospital,
    metrics: {
      totalPatients: patientRows.length,
      activeDoctors: doctorRows.length,
      activeStaff: staffRows.length,
      totalWards: wardRows.length,
      totalRooms: roomRows.length,
      totalBeds: bedRows.length,
      occupiedBeds: bedRows.filter((bed) => bed.status === "OCCUPIED").length,
      availableBeds: bedRows.filter((bed) => bed.status === "FREE").length,
      queuedMessages: messageRows.filter((message) => message.status === "QUEUED")
        .length,
      publishedPosts: publishedRows.length,
    },
    operations,
    doctorLoad,
    recentPosts: recentPosts.slice(0, 3),
  };
}
