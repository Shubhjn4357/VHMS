import { and, desc, eq, gte, inArray, isNull, lt, ne, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  admissions,
  appointments,
  beds,
  bills,
  consentDocuments,
  consentTemplates,
  dischargeSummaries,
  doctors,
  patients,
  rooms,
  wards,
} from "@/db/schema";
import type {
  IpdWorkspaceResponse,
  OpdWorkspaceResponse,
} from "@/types/workflows";

function startOfToday() {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfToday() {
  const value = startOfToday();
  value.setDate(value.getDate() + 1);
  return value;
}

function fullName(firstName: string, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ");
}

export async function getOpdWorkspace(): Promise<OpdWorkspaceResponse> {
  const db = getDb();
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const [visitRows, recentPatientRows] = await Promise.all([
    db
      .select({
        appointmentId: appointments.id,
        patientId: patients.id,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientHospitalNumber: patients.hospitalNumber,
        doctorId: doctors.id,
        doctorName: doctors.fullName,
        doctorDepartment: doctors.specialty,
        scheduledFor: appointments.scheduledFor,
        status: appointments.status,
        visitType: appointments.visitType,
        billId: bills.id,
        billNumber: bills.billNumber,
        billStatus: bills.billStatus,
        paymentStatus: bills.paymentStatus,
        totalAmount: bills.totalAmount,
        amountPaid: bills.amountPaid,
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .leftJoin(bills, eq(bills.appointmentId, appointments.id))
      .where(
        and(
          gte(appointments.scheduledFor, todayStart),
          lt(appointments.scheduledFor, todayEnd),
        ),
      )
      .orderBy(appointments.scheduledFor),
    db
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        hospitalNumber: patients.hospitalNumber,
        createdAt: patients.createdAt,
      })
      .from(patients)
      .orderBy(desc(patients.createdAt))
      .limit(6),
  ]);

  const todayVisits = visitRows.map((row) => ({
    appointmentId: row.appointmentId,
    patientId: row.patientId,
    patientName: fullName(row.patientFirstName, row.patientLastName),
    patientHospitalNumber: row.patientHospitalNumber,
    doctorId: row.doctorId,
    doctorName: row.doctorName,
    doctorDepartment: row.doctorDepartment ?? null,
    scheduledFor: row.scheduledFor.toISOString(),
    status: row.status,
    visitType: row.visitType,
    billId: row.billId ?? null,
    billNumber: row.billNumber ?? null,
    billStatus: row.billStatus ?? null,
    paymentStatus: row.paymentStatus ?? null,
    balanceAmount: row.billId
      ? Number(row.totalAmount ?? 0) - Number(row.amountPaid ?? 0)
      : null,
  }));

  return {
    summary: {
      scheduledToday: todayVisits.length,
      checkedInToday: todayVisits.filter((visit) => visit.status === "CHECKED_IN").length,
      completedToday: todayVisits.filter((visit) => visit.status === "COMPLETED").length,
      waitingForBilling: todayVisits.filter((visit) =>
        ["CHECKED_IN", "COMPLETED"].includes(visit.status) && !visit.billId
      ).length,
      unpaidOpdBills: todayVisits.filter((visit) =>
        visit.billId !== null && visit.balanceAmount !== null && visit.balanceAmount > 0
      ).length,
    },
    todayVisits,
    recentPatients: recentPatientRows.map((row) => ({
      id: row.id,
      fullName: fullName(row.firstName, row.lastName),
      hospitalNumber: row.hospitalNumber,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function getIpdWorkspace(): Promise<IpdWorkspaceResponse> {
  const db = getDb();

  const [activeAdmissionRows, bedStatsRows, dischargeRows, consentRows] = await Promise
    .all([
      db
        .select({
          admissionId: admissions.id,
          patientId: patients.id,
          patientFirstName: patients.firstName,
          patientLastName: patients.lastName,
          patientHospitalNumber: patients.hospitalNumber,
          doctorName: doctors.fullName,
          wardName: wards.name,
          roomNumber: rooms.roomNumber,
          bedNumber: beds.bedNumber,
          admittedAt: admissions.admittedAt,
          dischargeSummaryStatus: dischargeSummaries.status,
          consentPending: sql<number>`coalesce(sum(case when ${consentDocuments.status} <> 'signed' then 1 else 0 end), 0)`,
        })
        .from(admissions)
        .innerJoin(patients, eq(admissions.patientId, patients.id))
        .leftJoin(doctors, eq(admissions.attendingDoctorId, doctors.id))
        .leftJoin(beds, eq(admissions.bedId, beds.id))
        .leftJoin(rooms, eq(beds.roomId, rooms.id))
        .leftJoin(wards, eq(beds.wardId, wards.id))
        .leftJoin(dischargeSummaries, eq(dischargeSummaries.admissionId, admissions.id))
        .leftJoin(consentDocuments, eq(consentDocuments.admissionId, admissions.id))
        .where(and(eq(admissions.status, "ADMITTED"), isNull(admissions.dischargedAt)))
        .groupBy(
          admissions.id,
          patients.id,
          doctors.fullName,
          wards.name,
          rooms.roomNumber,
          beds.bedNumber,
          dischargeSummaries.status,
        )
        .orderBy(desc(admissions.admittedAt)),
      db
        .select({
          status: beds.status,
          total: sql<number>`count(*)`,
        })
        .from(beds)
        .groupBy(beds.status),
      db
        .select({
          id: dischargeSummaries.id,
          patientFirstName: patients.firstName,
          patientLastName: patients.lastName,
          patientHospitalNumber: patients.hospitalNumber,
          status: dischargeSummaries.status,
          updatedAt: dischargeSummaries.updatedAt,
        })
        .from(dischargeSummaries)
        .innerJoin(admissions, eq(dischargeSummaries.admissionId, admissions.id))
        .innerJoin(patients, eq(admissions.patientId, patients.id))
        .where(ne(dischargeSummaries.status, "FINALIZED"))
        .orderBy(desc(dischargeSummaries.updatedAt))
        .limit(6),
      db
        .select({
          id: consentDocuments.id,
          patientFirstName: patients.firstName,
          patientLastName: patients.lastName,
          patientHospitalNumber: patients.hospitalNumber,
          templateName: consentTemplates.name,
          status: consentDocuments.status,
          updatedAt: consentDocuments.updatedAt,
        })
        .from(consentDocuments)
        .innerJoin(patients, eq(consentDocuments.patientId, patients.id))
        .innerJoin(consentTemplates, eq(consentDocuments.templateId, consentTemplates.id))
        .where(inArray(consentDocuments.status, ["draft", "pending_signature"]))
        .orderBy(desc(consentDocuments.updatedAt))
        .limit(6),
    ]);

  const occupiedBeds = bedStatsRows.find((row) => row.status === "OCCUPIED")?.total ?? 0;
  const availableBeds = bedStatsRows.find((row) => row.status === "FREE")?.total ?? 0;

  return {
    summary: {
      activeAdmissions: activeAdmissionRows.length,
      occupiedBeds,
      availableBeds,
      pendingDischargeSummaries: dischargeRows.length,
      pendingConsents: consentRows.length,
    },
    activeAdmissions: activeAdmissionRows.map((row) => ({
      admissionId: row.admissionId,
      patientId: row.patientId,
      patientName: fullName(row.patientFirstName, row.patientLastName),
      patientHospitalNumber: row.patientHospitalNumber,
      doctorName: row.doctorName ?? null,
      wardName: row.wardName ?? null,
      roomNumber: row.roomNumber ?? null,
      bedNumber: row.bedNumber ?? null,
      admittedAt: row.admittedAt.toISOString(),
      dischargeSummaryStatus: row.dischargeSummaryStatus ?? null,
      consentPending: Number(row.consentPending ?? 0),
    })),
    recentDischargeDrafts: dischargeRows.map((row) => ({
      id: row.id,
      patientName: fullName(row.patientFirstName, row.patientLastName),
      patientHospitalNumber: row.patientHospitalNumber,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
    })),
    pendingConsentDocuments: consentRows.map((row) => ({
      id: row.id,
      patientName: fullName(row.patientFirstName, row.patientLastName),
      patientHospitalNumber: row.patientHospitalNumber,
      templateName: row.templateName,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}
