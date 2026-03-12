import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  admissions,
  appointments,
  departments,
  doctors,
} from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { recordAuditLog } from "@/lib/audit/log";
import type {
  DoctorDeleteResponse,
  DoctorLookupRecord,
  DoctorLookupResponse,
  DoctorManagementInput,
  DoctorManagementRecord,
  DoctorManagementResponse,
  DoctorUpdateInput,
} from "@/types/doctor";

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeRequired(value: string) {
  return value.trim();
}

function includesQuery(
  values: Array<string | null | undefined>,
  query: string,
) {
  return values.some((value) => (value ?? "").toLowerCase().includes(query));
}

function toDoctorLookupRecord(row: {
  doctors: typeof doctors.$inferSelect;
  departments: typeof departments.$inferSelect | null;
}): DoctorLookupRecord {
  return {
    id: row.doctors.id,
    fullName: row.doctors.fullName,
    designation: row.doctors.designation ?? null,
    specialty: row.doctors.specialty ?? null,
    departmentId: row.doctors.departmentId ?? null,
    departmentName: row.departments?.name ?? null,
    consultationFee: row.doctors.consultationFee,
    email: row.doctors.email ?? null,
    phone: row.doctors.phone ?? null,
    signatureUrl: row.doctors.signatureUrl ?? null,
    active: row.doctors.active,
  };
}

async function getDoctorsWithDepartments() {
  const db = getDb();
  return db
    .select()
    .from(doctors)
    .leftJoin(departments, eq(doctors.departmentId, departments.id))
    .orderBy(asc(doctors.fullName));
}

async function getDoctorRowById(id: string) {
  const db = getDb();
  const [row] = await db.select().from(doctors).where(eq(doctors.id, id)).limit(1);
  return row ?? null;
}

async function resolveDepartmentIdByName(departmentName?: string | null) {
  const db = getDb();
  const normalizedName = normalizeOptional(departmentName);
  if (!normalizedName) {
    return null;
  }

  const [existingDepartment] = await db
    .select()
    .from(departments)
    .where(eq(departments.name, normalizedName))
    .limit(1);

  if (existingDepartment) {
    return existingDepartment.id;
  }

  const [createdDepartment] = await db
    .insert(departments)
    .values({ name: normalizedName })
    .returning({ id: departments.id });

  if (!createdDepartment) {
    throw new ApiError(500, "Unable to create the doctor department.");
  }

  return createdDepartment.id;
}

async function ensureUniqueDoctorEmail(email?: string | null, ignoreId?: string) {
  const normalizedEmail = normalizeOptional(email)?.toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  const db = getDb();
  const rows = await db.select().from(doctors).where(eq(doctors.email, normalizedEmail));
  const duplicate = rows.find((row) => row.id !== ignoreId);

  if (duplicate) {
    throw new ApiError(409, "Another doctor already uses this email.");
  }

  return normalizedEmail;
}

async function getDoctorManagementRecordById(id: string) {
  const payload = await listDoctorManagement();
  return payload.entries.find((entry) => entry.id === id) ?? null;
}

export async function listDoctorLookup(
  q?: string,
): Promise<DoctorLookupResponse> {
  const rows = await getDoctorsWithDepartments();
  const query = q?.trim().toLowerCase() ?? "";
  const dedupedEntries = rows
    .map(toDoctorLookupRecord)
    .filter((entry) => entry.active)
    .reduce<DoctorLookupRecord[]>((entries, entry) => {
      const duplicate = entries.some(
        (existing) =>
          existing.fullName === entry.fullName &&
          existing.departmentName === entry.departmentName,
      );

      if (!duplicate) {
        entries.push(entry);
      }

      return entries;
    }, []);

  const entries = dedupedEntries.filter((entry) => {
    if (!query) {
      return true;
    }

    return includesQuery(
      [
        entry.fullName,
        entry.specialty,
        entry.designation,
        entry.departmentName,
      ],
      query,
    );
  });

  return { entries };
}

export async function listDoctorManagement(filters: {
  q?: string;
  status?: "ALL" | "ACTIVE" | "INACTIVE";
} = {}): Promise<DoctorManagementResponse> {
  const db = getDb();
  const [rows, appointmentRows, departmentRows] = await Promise.all([
    getDoctorsWithDepartments(),
    db
      .select({
        doctorId: appointments.doctorId,
        scheduledFor: appointments.scheduledFor,
      })
      .from(appointments),
    db.select().from(departments).orderBy(asc(departments.name)),
  ]);

  const appointmentSummary = appointmentRows.reduce((map, row) => {
    const current = map.get(row.doctorId) ?? {
      totalAppointments: 0,
      lastAppointmentAt: null as string | null,
    };

    current.totalAppointments += 1;
    const scheduledAt = row.scheduledFor.toISOString();
    if (!current.lastAppointmentAt || scheduledAt > current.lastAppointmentAt) {
      current.lastAppointmentAt = scheduledAt;
    }

    map.set(row.doctorId, current);
    return map;
  }, new Map<string, { totalAppointments: number; lastAppointmentAt: string | null }>());

  const query = filters.q?.trim().toLowerCase() ?? "";
  const status = filters.status ?? "ALL";
  const entries = rows
    .map<DoctorManagementRecord>((row) => {
      const base = toDoctorLookupRecord(row);
      const summary = appointmentSummary.get(base.id);

      return {
        ...base,
        totalAppointments: summary?.totalAppointments ?? 0,
        lastAppointmentAt: summary?.lastAppointmentAt ?? null,
        createdAt: row.doctors.createdAt.toISOString(),
      };
    })
    .filter((entry) => {
      const matchesStatus = status === "ALL" ||
        (status === "ACTIVE" && entry.active) ||
        (status === "INACTIVE" && !entry.active);

      if (!matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      return includesQuery(
        [
          entry.fullName,
          entry.designation,
          entry.specialty,
          entry.departmentName,
          entry.email,
          entry.phone,
        ],
        query,
      );
    });

  return {
    entries,
    summary: {
      total: entries.length,
      active: entries.filter((entry) => entry.active).length,
      inactive: entries.filter((entry) => !entry.active).length,
      departments: departmentRows.length,
    },
    directories: {
      departments: departmentRows.map((department) => ({
        id: department.id,
        name: department.name,
      })),
    },
  };
}

export async function createDoctor(
  input: DoctorManagementInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const departmentId = await resolveDepartmentIdByName(input.departmentName);
  const normalizedEmail = await ensureUniqueDoctorEmail(input.email);

  const [createdRow] = await db
    .insert(doctors)
    .values({
      departmentId,
      fullName: normalizeRequired(input.fullName),
      designation: normalizeOptional(input.designation),
      consultationFee: input.consultationFee,
      specialty: normalizeOptional(input.specialty),
      email: normalizedEmail,
      phone: normalizeOptional(input.phone),
      signatureUrl: normalizeOptional(input.signatureUrl),
      active: input.active,
      updatedAt: new Date(),
    })
    .returning({ id: doctors.id });

  if (!createdRow) {
    throw new ApiError(500, "Unable to create the doctor.");
  }

  await recordAuditLog({
    actorUserId,
    action: "doctors.created",
    entityType: "doctor",
    entityId: createdRow.id,
    metadata: {
      fullName: input.fullName,
      departmentName: normalizeOptional(input.departmentName),
      active: input.active,
    },
  });

  const createdRecord = await getDoctorManagementRecordById(createdRow.id);
  if (!createdRecord) {
    throw new ApiError(500, "Unable to load the created doctor.");
  }

  return createdRecord;
}

export async function updateDoctor(
  input: DoctorUpdateInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const existingRow = await getDoctorRowById(input.id);

  if (!existingRow) {
    throw new ApiError(404, "Doctor not found.");
  }

  const departmentId = input.departmentName !== undefined
    ? await resolveDepartmentIdByName(input.departmentName)
    : existingRow.departmentId;
  const normalizedEmail = input.email !== undefined
    ? await ensureUniqueDoctorEmail(input.email, input.id)
    : existingRow.email;

  await db
    .update(doctors)
    .set({
      departmentId,
      fullName: input.fullName
        ? normalizeRequired(input.fullName)
        : existingRow.fullName,
      designation: input.designation !== undefined
        ? normalizeOptional(input.designation)
        : existingRow.designation,
      consultationFee: input.consultationFee ?? existingRow.consultationFee,
      specialty: input.specialty !== undefined
        ? normalizeOptional(input.specialty)
        : existingRow.specialty,
      email: normalizedEmail,
      phone: input.phone !== undefined
        ? normalizeOptional(input.phone)
        : existingRow.phone,
      signatureUrl: input.signatureUrl !== undefined
        ? normalizeOptional(input.signatureUrl)
        : existingRow.signatureUrl,
      active: input.active ?? existingRow.active,
      updatedAt: new Date(),
    })
    .where(eq(doctors.id, input.id));

  await recordAuditLog({
    actorUserId,
    action: "doctors.updated",
    entityType: "doctor",
    entityId: input.id,
    metadata: {
      fullName: input.fullName ?? existingRow.fullName,
    },
  });

  const updatedRecord = await getDoctorManagementRecordById(input.id);
  if (!updatedRecord) {
    throw new ApiError(500, "Unable to load the updated doctor.");
  }

  return updatedRecord;
}

export async function deleteDoctor(
  id: string,
  actorUserId?: string | null,
): Promise<DoctorDeleteResponse> {
  const db = getDb();
  const existingRow = await getDoctorRowById(id);

  if (!existingRow) {
    throw new ApiError(404, "Doctor not found.");
  }

  const [appointmentLink] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(eq(appointments.doctorId, id))
    .limit(1);
  if (appointmentLink) {
    throw new ApiError(
      409,
      "This doctor is already linked to appointments. Set them inactive instead of deleting them.",
    );
  }

  const [admissionLink] = await db
    .select({ id: admissions.id })
    .from(admissions)
    .where(eq(admissions.attendingDoctorId, id))
    .limit(1);
  if (admissionLink) {
    throw new ApiError(
      409,
      "This doctor is already linked to admissions. Set them inactive instead of deleting them.",
    );
  }

  await db.delete(doctors).where(eq(doctors.id, id));

  await recordAuditLog({
    actorUserId,
    action: "doctors.deleted",
    entityType: "doctor",
    entityId: id,
    metadata: {
      fullName: existingRow.fullName,
    },
  });

  return { id };
}
