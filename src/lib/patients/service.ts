import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  admissions,
  appointments,
  bills,
  communicationLogs,
  consentDocuments,
  patients,
} from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/log";
import { ApiError } from "@/lib/api/errors";
import type {
  PatientDeleteResponse,
  PatientFilters,
  PatientListResponse,
  PatientRecord,
  PatientUpdateInput,
  PatientUpsertInput,
} from "@/types/patient";

function optionalString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function optionalLowercaseEmail(value?: string | null) {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

function optionalDateString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function optionalBloodGroup<T extends string>(value?: T | "" | null) {
  return value ? value : null;
}

function formatPatientName(
  firstName: string,
  lastName?: string | null,
) {
  return [firstName, lastName].filter(Boolean).join(" ");
}

function formatAgeLabel(dateOfBirth?: string | null) {
  if (!dateOfBirth) {
    return null;
  }

  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) {
    return null;
  }

  const today = new Date();
  let years = today.getFullYear() - dob.getFullYear();
  const monthDelta = today.getMonth() - dob.getMonth();
  const dayDelta = today.getDate() - dob.getDate();

  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
    years -= 1;
  }

  return years >= 0 ? `${years} yrs` : null;
}

function toPatientRecord(row: typeof patients.$inferSelect): PatientRecord {
  return {
    id: row.id,
    hospitalNumber: row.hospitalNumber,
    firstName: row.firstName,
    lastName: row.lastName ?? null,
    fullName: formatPatientName(row.firstName, row.lastName),
    gender: row.gender,
    dateOfBirth: row.dateOfBirth ?? null,
    ageLabel: formatAgeLabel(row.dateOfBirth),
    phone: row.phone ?? null,
    alternatePhone: row.alternatePhone ?? null,
    email: row.email ?? null,
    address: row.address ?? null,
    city: row.city ?? null,
    state: row.state ?? null,
    emergencyContact: row.emergencyContact ?? null,
    bloodGroup: row.bloodGroup ?? null,
    photoUrl: row.photoUrl ?? null,
    notes: row.notes ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function generateHospitalNumber() {
  const db = getDb();
  const prefix = `VHMS-${
    new Date().toISOString().slice(0, 10).replaceAll("-", "")
  }`;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = Math.floor(Math.random() * 9000 + 1000);
    const hospitalNumber = `${prefix}-${suffix}`;
    const [existing] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.hospitalNumber, hospitalNumber))
      .limit(1);

    if (!existing) {
      return hospitalNumber;
    }
  }

  throw new ApiError(500, "Unable to allocate a unique hospital number.");
}

async function getPatientRecordById(id: string) {
  const db = getDb();
  const [row] = await db.select().from(patients).where(eq(patients.id, id))
    .limit(1);

  return row ? toPatientRecord(row) : null;
}

function summarize(entries: PatientRecord[]) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return {
    total: entries.length,
    addedThisWeek: entries.filter(
      (entry) => new Date(entry.createdAt).getTime() >= weekAgo,
    ).length,
    withPrimaryPhone: entries.filter((entry) => Boolean(entry.phone)).length,
    missingCriticalProfile: entries.filter(
      (entry) => !entry.phone || !entry.dateOfBirth,
    ).length,
  };
}

export async function listPatients(
  filters: PatientFilters = {},
): Promise<PatientListResponse> {
  const db = getDb();
  const rows = await db
    .select()
    .from(patients)
    .orderBy(desc(patients.updatedAt), desc(patients.createdAt));

  const query = filters.q?.trim().toLowerCase() ?? "";
  const entries = rows
    .map(toPatientRecord)
    .filter((entry) => {
      if (!query) {
        return true;
      }

      return [
        entry.fullName,
        entry.hospitalNumber,
        entry.phone ?? "",
        entry.email ?? "",
        entry.city ?? "",
        entry.state ?? "",
      ].some((value) => value.toLowerCase().includes(query));
    });

  return {
    entries,
    summary: summarize(entries),
    filters: {
      q: query,
    },
  };
}

export async function createPatient(
  input: PatientUpsertInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const hospitalNumber = await generateHospitalNumber();
  const now = new Date();

  await db.insert(patients).values({
    hospitalNumber,
    firstName: input.firstName.trim(),
    lastName: optionalString(input.lastName),
    gender: input.gender,
    dateOfBirth: optionalDateString(input.dateOfBirth),
    phone: optionalString(input.phone),
    alternatePhone: optionalString(input.alternatePhone),
    email: optionalLowercaseEmail(input.email),
    address: optionalString(input.address),
    city: optionalString(input.city),
    state: optionalString(input.state),
    emergencyContact: optionalString(input.emergencyContact),
    bloodGroup: optionalBloodGroup(input.bloodGroup),
    photoUrl: optionalString(input.photoUrl),
    notes: optionalString(input.notes),
    updatedAt: now,
  });

  const [createdRow] = await db
    .select()
    .from(patients)
    .where(eq(patients.hospitalNumber, hospitalNumber))
    .limit(1);

  if (!createdRow) {
    throw new ApiError(500, "Unable to load the created patient record.");
  }

  await recordAuditLog({
    actorUserId,
    action: "patients.created",
    entityType: "patient",
    entityId: createdRow.id,
    metadata: {
      hospitalNumber,
      fullName: formatPatientName(input.firstName, input.lastName),
    },
  });

  return toPatientRecord(createdRow);
}

export async function updatePatient(
  input: PatientUpdateInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const [existingRow] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, input.id))
    .limit(1);

  if (!existingRow) {
    throw new ApiError(404, "Patient record not found.");
  }

  await db
    .update(patients)
    .set({
      firstName: input.firstName?.trim() ?? existingRow.firstName,
      lastName: input.lastName !== undefined
        ? optionalString(input.lastName)
        : existingRow.lastName,
      gender: input.gender ?? existingRow.gender,
      dateOfBirth: input.dateOfBirth !== undefined
        ? optionalDateString(input.dateOfBirth)
        : existingRow.dateOfBirth,
      phone: input.phone !== undefined
        ? optionalString(input.phone)
        : existingRow.phone,
      alternatePhone: input.alternatePhone !== undefined
        ? optionalString(input.alternatePhone)
        : existingRow.alternatePhone,
      email: input.email !== undefined
        ? optionalLowercaseEmail(input.email)
        : existingRow.email,
      address: input.address !== undefined
        ? optionalString(input.address)
        : existingRow.address,
      city: input.city !== undefined
        ? optionalString(input.city)
        : existingRow.city,
      state: input.state !== undefined
        ? optionalString(input.state)
        : existingRow.state,
      emergencyContact: input.emergencyContact !== undefined
        ? optionalString(input.emergencyContact)
        : existingRow.emergencyContact,
      bloodGroup: input.bloodGroup !== undefined
        ? optionalBloodGroup(input.bloodGroup)
        : existingRow.bloodGroup,
      photoUrl: input.photoUrl !== undefined
        ? optionalString(input.photoUrl)
        : existingRow.photoUrl,
      notes: input.notes !== undefined
        ? optionalString(input.notes)
        : existingRow.notes,
      updatedAt: new Date(),
    })
    .where(eq(patients.id, input.id));

  await recordAuditLog({
    actorUserId,
    action: "patients.updated",
    entityType: "patient",
    entityId: input.id,
    metadata: {
      hospitalNumber: existingRow.hospitalNumber,
    },
  });

  const updatedRecord = await getPatientRecordById(input.id);

  if (!updatedRecord) {
    throw new ApiError(500, "Unable to load the updated patient record.");
  }

  return updatedRecord;
}

export async function deletePatient(
  id: string,
  actorUserId?: string | null,
): Promise<PatientDeleteResponse> {
  const db = getDb();
  const [existingRow] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, id))
    .limit(1);

  if (!existingRow) {
    throw new ApiError(404, "Patient record not found.");
  }

  const [appointmentReference] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(eq(appointments.patientId, id))
    .limit(1);

  if (appointmentReference) {
    throw new ApiError(
      400,
      "This patient is linked to appointments and cannot be deleted.",
    );
  }

  const [admissionReference] = await db
    .select({ id: admissions.id })
    .from(admissions)
    .where(eq(admissions.patientId, id))
    .limit(1);

  if (admissionReference) {
    throw new ApiError(
      400,
      "This patient is linked to admissions and cannot be deleted.",
    );
  }

  const [billReference] = await db
    .select({ id: bills.id })
    .from(bills)
    .where(eq(bills.patientId, id))
    .limit(1);

  if (billReference) {
    throw new ApiError(
      400,
      "This patient is linked to bills and cannot be deleted.",
    );
  }

  const [consentReference] = await db
    .select({ id: consentDocuments.id })
    .from(consentDocuments)
    .where(eq(consentDocuments.patientId, id))
    .limit(1);

  if (consentReference) {
    throw new ApiError(
      400,
      "This patient is linked to consent records and cannot be deleted.",
    );
  }

  const [communicationReference] = await db
    .select({ id: communicationLogs.id })
    .from(communicationLogs)
    .where(eq(communicationLogs.patientId, id))
    .limit(1);

  if (communicationReference) {
    throw new ApiError(
      400,
      "This patient is linked to communication logs and cannot be deleted.",
    );
  }

  await db.delete(patients).where(eq(patients.id, id));

  await recordAuditLog({
    actorUserId,
    action: "patients.deleted",
    entityType: "patient",
    entityId: id,
    metadata: {
      hospitalNumber: existingRow.hospitalNumber,
      fullName: formatPatientName(existingRow.firstName, existingRow.lastName),
    },
  });

  return {
    id,
    deleted: true,
  };
}
