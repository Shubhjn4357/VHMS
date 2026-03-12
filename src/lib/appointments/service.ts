import { and, desc, eq, gte, lt } from "drizzle-orm";

import { getDb } from "@/db/client";
import { appointments, bills, departments, doctors, patients } from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/log";
import { ApiError } from "@/lib/api/errors";
import type {
  AppointmentDeleteResponse,
  AppointmentFilters,
  AppointmentListResponse,
  AppointmentRecord,
  AppointmentUpdateInput,
  AppointmentUpsertInput,
} from "@/types/appointment";

function optionalString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toAppointmentRecord(row: {
  appointments: typeof appointments.$inferSelect;
  patients: typeof patients.$inferSelect;
  doctors: typeof doctors.$inferSelect;
  departments: typeof departments.$inferSelect | null;
}): AppointmentRecord {
  return {
    id: row.appointments.id,
    patientId: row.patients.id,
    patientName: [row.patients.firstName, row.patients.lastName]
      .filter(Boolean)
      .join(" "),
    patientHospitalNumber: row.patients.hospitalNumber,
    doctorId: row.doctors.id,
    doctorName: row.doctors.fullName,
    doctorConsultationFee: row.doctors.consultationFee,
    doctorDepartment: row.departments?.name ?? null,
    scheduledFor: row.appointments.scheduledFor.toISOString(),
    visitType: row.appointments.visitType,
    queueNumber: row.appointments.queueNumber ?? null,
    status: row.appointments.status,
    notes: row.appointments.notes ?? null,
    checkedInAt: row.appointments.checkedInAt?.toISOString() ?? null,
    createdAt: row.appointments.createdAt.toISOString(),
    updatedAt: row.appointments.updatedAt.toISOString(),
  };
}

async function assertPatientExists(patientId: string) {
  const db = getDb();
  const [patientRow] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);

  if (!patientRow) {
    throw new ApiError(400, "Selected patient does not exist.");
  }
}

async function assertDoctorExists(doctorId: string) {
  const db = getDb();
  const [doctorRow] = await db
    .select({ id: doctors.id, active: doctors.active })
    .from(doctors)
    .where(eq(doctors.id, doctorId))
    .limit(1);

  if (!doctorRow || !doctorRow.active) {
    throw new ApiError(400, "Selected doctor is unavailable.");
  }
}

async function getAppointmentRecordById(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .leftJoin(departments, eq(doctors.departmentId, departments.id))
    .where(eq(appointments.id, id))
    .limit(1);

  return row ? toAppointmentRecord(row) : null;
}

function buildDayRange(value: Date) {
  const start = new Date(value);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

async function getNextQueueNumber(doctorId: string, scheduledFor: Date) {
  const db = getDb();
  const { start, end } = buildDayRange(scheduledFor);
  const rows = await db
    .select({ queueNumber: appointments.queueNumber })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, doctorId),
        gte(appointments.scheduledFor, start),
        lt(appointments.scheduledFor, end),
      ),
    );

  const highestQueueNumber = rows.reduce((max, row) => {
    if (!row.queueNumber || row.queueNumber <= max) {
      return max;
    }

    return row.queueNumber;
  }, 0);

  return highestQueueNumber + 1;
}

function summarize(entries: AppointmentRecord[]) {
  const now = Date.now();

  return {
    total: entries.length,
    upcoming: entries.filter((entry) => {
      const timestamp = new Date(entry.scheduledFor).getTime();
      return (
        timestamp >= now &&
        entry.status !== "CANCELLED" &&
        entry.status !== "COMPLETED" &&
        entry.status !== "NO_SHOW"
      );
    }).length,
    checkedIn: entries.filter((entry) => entry.status === "CHECKED_IN").length,
    completed: entries.filter((entry) => entry.status === "COMPLETED").length,
    cancelled: entries.filter((entry) => entry.status === "CANCELLED").length,
  };
}

export async function listAppointments(
  filters: AppointmentFilters = {},
): Promise<AppointmentListResponse> {
  const db = getDb();
  const rows = await db
    .select()
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .leftJoin(departments, eq(doctors.departmentId, departments.id))
    .orderBy(desc(appointments.scheduledFor), desc(appointments.updatedAt));

  const query = filters.q?.trim().toLowerCase() ?? "";
  const status = filters.status ?? "ALL";
  const entries = rows
    .map(toAppointmentRecord)
    .filter((entry) => {
      const matchesStatus = status === "ALL" || entry.status === status;
      if (!matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        entry.patientName,
        entry.patientHospitalNumber,
        entry.doctorName,
        entry.doctorDepartment ?? "",
        entry.visitType,
        entry.status,
      ].some((value) => value.toLowerCase().includes(query));
    });

  return {
    entries,
    summary: summarize(entries),
    filters: {
      q: query,
      status,
    },
  };
}

export async function createAppointment(
  input: AppointmentUpsertInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const scheduledFor = new Date(input.scheduledFor);

  if (Number.isNaN(scheduledFor.getTime())) {
    throw new ApiError(400, "Invalid appointment date and time.");
  }

  await assertPatientExists(input.patientId);
  await assertDoctorExists(input.doctorId);

  const queueNumber = await getNextQueueNumber(input.doctorId, scheduledFor);
  const now = new Date();

  const [createdRow] = await db
    .insert(appointments)
    .values({
      patientId: input.patientId,
      doctorId: input.doctorId,
      scheduledFor,
      visitType: input.visitType,
      queueNumber,
      status: input.status,
      notes: optionalString(input.notes),
      checkedInAt: input.status === "CHECKED_IN" ? now : null,
      updatedAt: now,
    })
    .returning({ id: appointments.id });

  if (!createdRow) {
    throw new ApiError(500, "Unable to load the created appointment.");
  }

  await recordAuditLog({
    actorUserId,
    action: "appointments.created",
    entityType: "appointment",
    entityId: createdRow.id,
    metadata: {
      patientId: input.patientId,
      doctorId: input.doctorId,
      queueNumber,
      visitType: input.visitType,
      status: input.status,
    },
  });

  const createdRecord = await getAppointmentRecordById(createdRow.id);

  if (!createdRecord) {
    throw new ApiError(500, "Unable to load the created appointment.");
  }

  return createdRecord;
}

export async function updateAppointment(
  input: AppointmentUpdateInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const [existingRow] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, input.id))
    .limit(1);

  if (!existingRow) {
    throw new ApiError(404, "Appointment not found.");
  }

  const nextPatientId = input.patientId ?? existingRow.patientId;
  const nextDoctorId = input.doctorId ?? existingRow.doctorId;
  const nextScheduledFor = input.scheduledFor
    ? new Date(input.scheduledFor)
    : existingRow.scheduledFor;

  if (Number.isNaN(nextScheduledFor.getTime())) {
    throw new ApiError(400, "Invalid appointment date and time.");
  }

  await assertPatientExists(nextPatientId);
  await assertDoctorExists(nextDoctorId);

  const queueNumberChanged = nextDoctorId !== existingRow.doctorId ||
    buildDayRange(nextScheduledFor).start.getTime() !==
      buildDayRange(existingRow.scheduledFor).start.getTime();

  const nextQueueNumber = queueNumberChanged
    ? await getNextQueueNumber(nextDoctorId, nextScheduledFor)
    : existingRow.queueNumber;

  const nextStatus = input.status ?? existingRow.status;
  const shouldStampCheckIn = nextStatus === "CHECKED_IN" &&
    existingRow.checkedInAt === null;

  await db
    .update(appointments)
    .set({
      patientId: nextPatientId,
      doctorId: nextDoctorId,
      scheduledFor: nextScheduledFor,
      visitType: input.visitType ?? existingRow.visitType,
      queueNumber: nextQueueNumber,
      status: nextStatus,
      notes: input.notes !== undefined
        ? optionalString(input.notes)
        : existingRow.notes,
      checkedInAt: shouldStampCheckIn ? new Date() : existingRow.checkedInAt,
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, input.id));

  await recordAuditLog({
    actorUserId,
    action: nextStatus === "CHECKED_IN"
      ? "appointments.checked_in"
      : "appointments.updated",
    entityType: "appointment",
    entityId: input.id,
    metadata: {
      patientId: nextPatientId,
      doctorId: nextDoctorId,
      queueNumber: nextQueueNumber,
      status: nextStatus,
    },
  });

  const updatedRecord = await getAppointmentRecordById(input.id);

  if (!updatedRecord) {
    throw new ApiError(500, "Unable to load the updated appointment.");
  }

  return updatedRecord;
}

export async function deleteAppointment(
  id: string,
  actorUserId?: string | null,
): Promise<AppointmentDeleteResponse> {
  const db = getDb();
  const [existingRow] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, id))
    .limit(1);

  if (!existingRow) {
    throw new ApiError(404, "Appointment not found.");
  }

  const [billReference] = await db
    .select({ id: bills.id })
    .from(bills)
    .where(eq(bills.appointmentId, id))
    .limit(1);

  if (billReference) {
    throw new ApiError(
      400,
      "This appointment is already linked to billing and cannot be deleted.",
    );
  }

  await db.delete(appointments).where(eq(appointments.id, id));

  await recordAuditLog({
    actorUserId,
    action: "appointments.deleted",
    entityType: "appointment",
    entityId: id,
    metadata: {
      patientId: existingRow.patientId,
      doctorId: existingRow.doctorId,
      status: existingRow.status,
      visitType: existingRow.visitType,
    },
  });

  return {
    id,
    deleted: true,
  };
}
