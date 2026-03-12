import { asc, desc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  admissions,
  beds,
  dischargeSummaries,
  dischargeSummaryVersions,
  doctors,
  patients,
  rooms,
  wards,
} from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/log";
import { ApiError } from "@/lib/api/errors";
import { listAdmissionLookups } from "@/lib/clinical/lookups";
import type {
  DischargeFilters,
  DischargeSummaryRecord,
  DischargeUpdateInput,
  DischargeUpsertInput,
  DischargeWorkspaceResponse,
} from "@/types/discharge";

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function buildBedLabel(row: {
  beds: typeof beds.$inferSelect | null;
  rooms: typeof rooms.$inferSelect | null;
  wards: typeof wards.$inferSelect | null;
}) {
  if (!row.beds?.bedNumber) {
    return null;
  }

  return [
    row.wards?.name ?? null,
    row.rooms?.roomNumber ?? null,
    row.beds.bedNumber,
  ].filter(Boolean).join(" / ");
}

function toDischargeRecord(row: {
  discharge_summaries: typeof dischargeSummaries.$inferSelect;
  admissions: typeof admissions.$inferSelect;
  patients: typeof patients.$inferSelect;
  doctors: typeof doctors.$inferSelect | null;
  beds: typeof beds.$inferSelect | null;
  rooms: typeof rooms.$inferSelect | null;
  wards: typeof wards.$inferSelect | null;
}): DischargeSummaryRecord {
  return {
    id: row.discharge_summaries.id,
    admissionId: row.admissions.id,
    patientId: row.patients.id,
    patientName: [row.patients.firstName, row.patients.lastName].filter(Boolean)
      .join(" "),
    patientHospitalNumber: row.patients.hospitalNumber,
    doctorName: row.doctors?.fullName ?? null,
    bedLabel: buildBedLabel(row),
    admittedAt: row.admissions.admittedAt.toISOString(),
    dischargedAt: toIsoString(row.admissions.dischargedAt ?? null),
    admissionStatus: row.admissions.status,
    status: row.discharge_summaries.status,
    diagnosis: row.discharge_summaries.diagnosis,
    hospitalCourse: row.discharge_summaries.hospitalCourse,
    procedures: row.discharge_summaries.procedures ?? null,
    dischargeMedication: row.discharge_summaries.dischargeMedication ?? null,
    dischargeAdvice: row.discharge_summaries.dischargeAdvice,
    followUpInstructions: row.discharge_summaries.followUpInstructions,
    versionCount: row.discharge_summaries.versionCount,
    finalizedAt: toIsoString(row.discharge_summaries.finalizedAt ?? null),
    createdAt: row.discharge_summaries.createdAt.toISOString(),
    updatedAt: row.discharge_summaries.updatedAt.toISOString(),
  };
}

function summarize(
  entries: DischargeSummaryRecord[],
  admissionsCount: number,
) {
  return {
    total: entries.length,
    drafts: entries.filter((entry) => entry.status === "DRAFT").length,
    finalized: entries.filter((entry) => entry.status === "FINALIZED").length,
    readyToFinalize: entries.filter((entry) =>
      entry.status === "DRAFT" &&
      entry.diagnosis.trim() &&
      entry.hospitalCourse.trim() &&
      entry.dischargeAdvice.trim() &&
      entry.followUpInstructions.trim()
    ).length,
    admissionsWithoutSummary: Math.max(admissionsCount - entries.length, 0),
  };
}

async function getSummaryRowById(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(dischargeSummaries)
    .innerJoin(admissions, eq(dischargeSummaries.admissionId, admissions.id))
    .innerJoin(patients, eq(admissions.patientId, patients.id))
    .leftJoin(doctors, eq(admissions.attendingDoctorId, doctors.id))
    .leftJoin(beds, eq(admissions.bedId, beds.id))
    .leftJoin(rooms, eq(beds.roomId, rooms.id))
    .leftJoin(wards, eq(beds.wardId, wards.id))
    .where(eq(dischargeSummaries.id, id))
    .limit(1);

  return row ? toDischargeRecord(row) : null;
}

export async function getDischargeSummaryById(id: string) {
  return getSummaryRowById(id);
}

async function getSummaryEntityById(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(dischargeSummaries)
    .where(eq(dischargeSummaries.id, id))
    .limit(1);

  return row ?? null;
}

async function getSummaryByAdmissionId(admissionId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(dischargeSummaries)
    .where(eq(dischargeSummaries.admissionId, admissionId))
    .limit(1);

  return row ?? null;
}

async function assertAdmissionExists(admissionId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: admissions.id })
    .from(admissions)
    .where(eq(admissions.id, admissionId))
    .limit(1);

  if (!row) {
    throw new ApiError(400, "Selected admission does not exist.");
  }
}

async function insertVersionSnapshot(
  dischargeSummaryId: string,
  versionNumber: number,
  snapshot: Record<string, unknown>,
  actorUserId?: string | null,
) {
  const db = getDb();
  await db.insert(dischargeSummaryVersions).values({
    dischargeSummaryId,
    versionNumber,
    snapshot: JSON.stringify(snapshot),
    createdByUserId: actorUserId ?? null,
  });
}

function buildSnapshot(input: {
  admissionId: string;
  status: string;
  diagnosis: string;
  hospitalCourse: string;
  procedures?: string | null;
  dischargeMedication?: string | null;
  dischargeAdvice: string;
  followUpInstructions: string;
}) {
  return {
    admissionId: input.admissionId,
    status: input.status,
    diagnosis: input.diagnosis,
    hospitalCourse: input.hospitalCourse,
    procedures: input.procedures ?? null,
    dischargeMedication: input.dischargeMedication ?? null,
    dischargeAdvice: input.dischargeAdvice,
    followUpInstructions: input.followUpInstructions,
  };
}

export async function listDischargeSummaries(
  filters: DischargeFilters = {},
): Promise<DischargeWorkspaceResponse> {
  const db = getDb();
  const [rows, admissionsLookup] = await Promise.all([
    db
      .select()
      .from(dischargeSummaries)
      .innerJoin(admissions, eq(dischargeSummaries.admissionId, admissions.id))
      .innerJoin(patients, eq(admissions.patientId, patients.id))
      .leftJoin(doctors, eq(admissions.attendingDoctorId, doctors.id))
      .leftJoin(beds, eq(admissions.bedId, beds.id))
      .leftJoin(rooms, eq(beds.roomId, rooms.id))
      .leftJoin(wards, eq(beds.wardId, wards.id))
      .orderBy(desc(dischargeSummaries.updatedAt), asc(patients.firstName)),
    listAdmissionLookups(),
  ]);

  const query = filters.q?.trim().toLowerCase() ?? "";
  const status = filters.status ?? "ALL";
  const entries = rows
    .map(toDischargeRecord)
    .filter((entry) => {
      if (status !== "ALL" && entry.status !== status) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        entry.patientName,
        entry.patientHospitalNumber,
        entry.doctorName ?? "",
        entry.diagnosis,
        entry.status,
      ].some((value) => value.toLowerCase().includes(query));
    });

  return {
    entries,
    admissions: admissionsLookup,
    summary: summarize(entries, admissionsLookup.length),
    filters: {
      q: query,
      status,
    },
  };
}

export async function createDischargeSummary(
  input: DischargeUpsertInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  await assertAdmissionExists(input.admissionId);

  const existingSummary = await getSummaryByAdmissionId(input.admissionId);
  if (existingSummary) {
    throw new ApiError(
      409,
      "A discharge summary already exists for the selected admission.",
    );
  }

  const [created] = await db
    .insert(dischargeSummaries)
    .values({
      admissionId: input.admissionId,
      diagnosis: input.diagnosis.trim(),
      hospitalCourse: input.hospitalCourse.trim(),
      procedures: input.procedures?.trim() || null,
      dischargeMedication: input.dischargeMedication?.trim() || null,
      dischargeAdvice: input.dischargeAdvice.trim(),
      followUpInstructions: input.followUpInstructions.trim(),
      preparedByUserId: actorUserId ?? null,
    })
    .returning({ id: dischargeSummaries.id });

  if (!created) {
    throw new ApiError(500, "Unable to create the discharge summary.");
  }

  await insertVersionSnapshot(
    created.id,
    1,
    buildSnapshot({
      admissionId: input.admissionId,
      status: "DRAFT",
      diagnosis: input.diagnosis.trim(),
      hospitalCourse: input.hospitalCourse.trim(),
      procedures: input.procedures?.trim() || null,
      dischargeMedication: input.dischargeMedication?.trim() || null,
      dischargeAdvice: input.dischargeAdvice.trim(),
      followUpInstructions: input.followUpInstructions.trim(),
    }),
    actorUserId,
  );

  await recordAuditLog({
    actorUserId,
    action: "discharge.summary.created",
    entityType: "discharge_summary",
    entityId: created.id,
    metadata: {
      admissionId: input.admissionId,
    },
  });

  const createdRecord = await getSummaryRowById(created.id);
  if (!createdRecord) {
    throw new ApiError(500, "Unable to load the created discharge summary.");
  }

  return createdRecord;
}

export async function updateDischargeSummary(
  input: DischargeUpdateInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const existing = await getSummaryEntityById(input.id);

  if (!existing) {
    throw new ApiError(404, "Discharge summary not found.");
  }

  if (existing.status === "FINALIZED") {
    throw new ApiError(409, "Finalized discharge summaries cannot be edited.");
  }

  const nextPayload = {
    diagnosis: input.diagnosis?.trim() ?? existing.diagnosis,
    hospitalCourse: input.hospitalCourse?.trim() ?? existing.hospitalCourse,
    procedures: input.procedures !== undefined
      ? input.procedures.trim() || null
      : existing.procedures,
    dischargeMedication: input.dischargeMedication !== undefined
      ? input.dischargeMedication.trim() || null
      : existing.dischargeMedication,
    dischargeAdvice: input.dischargeAdvice?.trim() ?? existing.dischargeAdvice,
    followUpInstructions: input.followUpInstructions?.trim() ??
      existing.followUpInstructions,
  };

  await db
    .update(dischargeSummaries)
    .set({
      ...nextPayload,
      versionCount: existing.versionCount + 1,
      updatedAt: new Date(),
    })
    .where(eq(dischargeSummaries.id, input.id));

  await insertVersionSnapshot(
    input.id,
    existing.versionCount + 1,
    buildSnapshot({
      admissionId: existing.admissionId,
      status: existing.status,
      ...nextPayload,
    }),
    actorUserId,
  );

  await recordAuditLog({
    actorUserId,
    action: "discharge.summary.updated",
    entityType: "discharge_summary",
    entityId: input.id,
    metadata: {
      admissionId: existing.admissionId,
      versionCount: existing.versionCount + 1,
    },
  });

  const updatedRecord = await getSummaryRowById(input.id);
  if (!updatedRecord) {
    throw new ApiError(500, "Unable to load the updated discharge summary.");
  }

  return updatedRecord;
}

export async function finalizeDischargeSummary(
  id: string,
  actorUserId?: string | null,
) {
  const db = getDb();
  const existing = await getSummaryEntityById(id);

  if (!existing) {
    throw new ApiError(404, "Discharge summary not found.");
  }

  if (existing.status === "FINALIZED") {
    throw new ApiError(409, "Discharge summary is already finalized.");
  }

  const requiredSections = [
    existing.diagnosis,
    existing.hospitalCourse,
    existing.dischargeAdvice,
    existing.followUpInstructions,
  ];

  if (requiredSections.some((section) => !section.trim())) {
    throw new ApiError(
      400,
      "Diagnosis, hospital course, discharge advice, and follow-up instructions are required before finalization.",
    );
  }

  await db
    .update(dischargeSummaries)
    .set({
      status: "FINALIZED",
      finalizedByUserId: actorUserId ?? null,
      finalizedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(dischargeSummaries.id, id));

  await recordAuditLog({
    actorUserId,
    action: "discharge.summary.finalized",
    entityType: "discharge_summary",
    entityId: id,
    metadata: {
      admissionId: existing.admissionId,
    },
  });

  const updatedRecord = await getSummaryRowById(id);
  if (!updatedRecord) {
    throw new ApiError(500, "Unable to load the finalized discharge summary.");
  }

  return updatedRecord;
}
