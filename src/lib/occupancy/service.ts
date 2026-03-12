import { and, asc, eq, isNull } from "drizzle-orm";

import type { BedStatus } from "@/constants/bedStatus";
import { getDb } from "@/db/client";
import { admissions, beds, doctors, patients, rooms, wards } from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/log";
import { ApiError } from "@/lib/api/errors";
import type {
  OccupancyAdmissionActionInput,
  OccupancyAssignmentInput,
  OccupancyBedRecord,
  OccupancyBedStatusUpdateInput,
  OccupancyBoardResponse,
  OccupancyFilters,
  OccupancyRoomRecord,
  OccupancySummary,
  OccupancyWardRecord,
} from "@/types/occupancy";

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function normalizeDateInput(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return new Date();
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, "Invalid admission date and time.");
  }

  return parsed;
}

type ActiveAdmissionRow = {
  admissions: typeof admissions.$inferSelect;
  patients: typeof patients.$inferSelect;
  doctors: typeof doctors.$inferSelect | null;
};

async function listActiveAdmissions() {
  const db = getDb();

  return db
    .select()
    .from(admissions)
    .innerJoin(patients, eq(admissions.patientId, patients.id))
    .leftJoin(doctors, eq(admissions.attendingDoctorId, doctors.id))
    .where(
      and(eq(admissions.status, "ADMITTED"), isNull(admissions.dischargedAt)),
    );
}

function buildBedRecord(
  bed: typeof beds.$inferSelect,
  room: typeof rooms.$inferSelect | null,
  ward: typeof wards.$inferSelect,
  activeAdmission?: ActiveAdmissionRow,
): OccupancyBedRecord {
  const patient = activeAdmission?.patients;
  const doctor = activeAdmission?.doctors;

  return {
    id: bed.id,
    wardId: ward.id,
    wardName: ward.name,
    wardFloor: ward.floor ?? null,
    roomId: room?.id ?? null,
    roomNumber: room?.roomNumber ?? null,
    roomType: room?.roomType ?? null,
    dailyCharge: room?.dailyCharge ?? null,
    bedNumber: bed.bedNumber,
    status: bed.status,
    admissionId: activeAdmission?.admissions.id ?? null,
    patientId: patient?.id ?? null,
    patientName: patient
      ? [patient.firstName, patient.lastName].filter(Boolean).join(" ")
      : null,
    patientHospitalNumber: patient?.hospitalNumber ?? null,
    doctorId: doctor?.id ?? null,
    doctorName: doctor?.fullName ?? null,
    admittedAt: toIsoString(activeAdmission?.admissions.admittedAt ?? null),
  };
}

function summarizeBeds(bedRecords: OccupancyBedRecord[]): OccupancySummary {
  return {
    totalBeds: bedRecords.length,
    occupiedBeds: bedRecords.filter((bed) => bed.status === "OCCUPIED").length,
    availableBeds: bedRecords.filter((bed) => bed.status === "FREE").length,
    reservedBeds: bedRecords.filter((bed) => bed.status === "RESERVED").length,
    cleaningBeds: bedRecords.filter((bed) => bed.status === "CLEANING").length,
    maintenanceBeds: bedRecords.filter((bed) => bed.status === "MAINTENANCE")
      .length,
    blockedBeds: bedRecords.filter((bed) => bed.status === "BLOCKED").length,
    activeAdmissions: bedRecords.filter((bed) => Boolean(bed.admissionId)).length,
  };
}

function matchesFilters(bed: OccupancyBedRecord, filters: OccupancyFilters) {
  const query = filters.q?.trim().toLowerCase() ?? "";

  if (filters.wardId && bed.wardId !== filters.wardId) {
    return false;
  }

  if (filters.status && filters.status !== "ALL" && bed.status !== filters.status) {
    return false;
  }

  if (!query) {
    return true;
  }

  return [
    bed.wardName,
    bed.wardFloor ?? "",
    bed.roomNumber ?? "",
    bed.roomType ?? "",
    bed.bedNumber,
    bed.status,
    bed.patientName ?? "",
    bed.patientHospitalNumber ?? "",
    bed.doctorName ?? "",
  ].some((value) => value.toLowerCase().includes(query));
}

function groupBoard(
  wardsList: typeof wards.$inferSelect[],
  roomsList: typeof rooms.$inferSelect[],
  bedRecords: OccupancyBedRecord[],
) {
  const roomsByWardId = roomsList.reduce((map, room) => {
    const entries = map.get(room.wardId ?? "") ?? [];
    entries.push(room);
    map.set(room.wardId ?? "", entries);
    return map;
  }, new Map<string, typeof rooms.$inferSelect[]>());

  const bedsByRoomId = bedRecords.reduce((map, bed) => {
    const entries = map.get(bed.roomId ?? "__unassigned__") ?? [];
    entries.push(bed);
    map.set(bed.roomId ?? "__unassigned__", entries);
    return map;
  }, new Map<string, OccupancyBedRecord[]>());

  const wardsGrouped = wardsList
    .map<OccupancyWardRecord | null>((ward) => {
      const wardRooms = roomsByWardId.get(ward.id) ?? [];
      const roomRecords = wardRooms
        .map<OccupancyRoomRecord | null>((room) => {
          const roomBeds = bedsByRoomId.get(room.id) ?? [];

          if (roomBeds.length === 0) {
            return null;
          }

          return {
            id: room.id,
            wardId: ward.id,
            roomNumber: room.roomNumber,
            roomType: room.roomType,
            dailyCharge: room.dailyCharge,
            totalBeds: roomBeds.length,
            occupiedBeds: roomBeds.filter((bed) => bed.status === "OCCUPIED").length,
            beds: roomBeds,
          };
        })
        .filter((room): room is OccupancyRoomRecord => Boolean(room));

      const wardBeds = roomRecords.flatMap((room) => room.beds);

      if (wardBeds.length === 0) {
        return null;
      }

      return {
        id: ward.id,
        name: ward.name,
        floor: ward.floor ?? null,
        totalBeds: wardBeds.length,
        occupiedBeds: wardBeds.filter((bed) => bed.status === "OCCUPIED").length,
        availableBeds: wardBeds.filter((bed) => bed.status === "FREE").length,
        rooms: roomRecords,
      };
    })
    .filter((ward): ward is OccupancyWardRecord => Boolean(ward));

  return wardsGrouped;
}

async function getBedById(id: string) {
  const db = getDb();
  const [row] = await db.select().from(beds).where(eq(beds.id, id)).limit(1);
  return row ?? null;
}

async function getActiveAdmissionByBedId(bedId: string) {
  const rows = await listActiveAdmissions();
  return rows.find((row) => row.admissions.bedId === bedId) ?? null;
}

async function getActiveAdmissionByPatientId(patientId: string) {
  const rows = await listActiveAdmissions();
  return rows.find((row) => row.admissions.patientId === patientId) ?? null;
}

async function getActiveAdmissionById(id: string) {
  const rows = await listActiveAdmissions();
  return rows.find((row) => row.admissions.id === id) ?? null;
}

async function assertPatientExists(patientId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);

  if (!row) {
    throw new ApiError(400, "Selected patient does not exist.");
  }
}

async function assertDoctorExists(doctorId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: doctors.id, active: doctors.active })
    .from(doctors)
    .where(eq(doctors.id, doctorId))
    .limit(1);

  if (!row || !row.active) {
    throw new ApiError(400, "Selected doctor is unavailable.");
  }
}

function assertBedEligibleForAdmission(
  bed: typeof beds.$inferSelect,
  activeAdmission: ActiveAdmissionRow | null,
) {
  if (activeAdmission || bed.status === "OCCUPIED") {
    throw new ApiError(400, "Selected bed is already occupied.");
  }

  if (!["FREE", "RESERVED"].includes(bed.status)) {
    throw new ApiError(
      400,
      "Only free or reserved beds can be assigned to a patient.",
    );
  }
}

async function getOccupancyBedSnapshot(id: string) {
  const payload = await listOccupancyBoard();
  const bedsList = payload.wards.flatMap((ward) =>
    ward.rooms.flatMap((room) => room.beds)
  );
  return bedsList.find((bed) => bed.id === id) ?? null;
}

export async function listOccupancyBoard(
  filters: OccupancyFilters = {},
): Promise<OccupancyBoardResponse> {
  const db = getDb();

  const [wardRows, roomRows, bedRows, activeAdmissionRows] = await Promise.all([
    db.select().from(wards).orderBy(asc(wards.name)),
    db.select().from(rooms).orderBy(asc(rooms.roomNumber)),
    db.select().from(beds).orderBy(asc(beds.bedNumber)),
    listActiveAdmissions(),
  ]);

  const roomMap = new Map(roomRows.map((room) => [room.id, room]));
  const wardMap = new Map(wardRows.map((ward) => [ward.id, ward]));
  const activeAdmissionByBedId = new Map(
    activeAdmissionRows
      .filter((row) => Boolean(row.admissions.bedId))
      .map((row) => [row.admissions.bedId as string, row]),
  );

  const filteredBeds = bedRows
    .map((bed) => {
      const ward = wardMap.get(bed.wardId ?? "");

      if (!ward) {
        return null;
      }

      return buildBedRecord(
        bed,
        bed.roomId ? roomMap.get(bed.roomId) ?? null : null,
        ward,
        activeAdmissionByBedId.get(bed.id),
      );
    })
    .filter((bed): bed is OccupancyBedRecord => Boolean(bed))
    .filter((bed) => matchesFilters(bed, filters));

  return {
    wards: groupBoard(wardRows, roomRows, filteredBeds),
    summary: summarizeBeds(filteredBeds),
    filters: {
      q: filters.q?.trim().toLowerCase() ?? "",
      wardId: filters.wardId ?? null,
      status: filters.status ?? "ALL",
    },
  };
}

export async function assignBedToPatient(
  input: OccupancyAssignmentInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const admittedAt = normalizeDateInput(input.admittedAt);

  await assertPatientExists(input.patientId);
  await assertDoctorExists(input.attendingDoctorId);

  const currentBed = await getBedById(input.bedId);
  if (!currentBed) {
    throw new ApiError(400, "Selected bed does not exist.");
  }

  const activeAdmissionForBed = await getActiveAdmissionByBedId(input.bedId);
  assertBedEligibleForAdmission(currentBed, activeAdmissionForBed);

  const activeAdmissionForPatient = await getActiveAdmissionByPatientId(
    input.patientId,
  );
  if (activeAdmissionForPatient) {
    throw new ApiError(409, "This patient already has an active admission.");
  }

  const [createdAdmission] = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(admissions)
      .values({
        patientId: input.patientId,
        bedId: input.bedId,
        attendingDoctorId: input.attendingDoctorId,
        admittedAt,
        status: "ADMITTED",
      })
      .returning({ id: admissions.id });

    await tx
      .update(beds)
      .set({
        status: "OCCUPIED",
      })
      .where(eq(beds.id, input.bedId));

    return inserted;
  });

  if (!createdAdmission) {
    throw new ApiError(500, "Unable to create the admission.");
  }

  await recordAuditLog({
    actorUserId,
    action: "occupancy.bed.assigned",
    entityType: "admission",
    entityId: createdAdmission.id,
    metadata: {
      patientId: input.patientId,
      bedId: input.bedId,
      attendingDoctorId: input.attendingDoctorId,
    },
  });

  const bedSnapshot = await getOccupancyBedSnapshot(input.bedId);

  if (!bedSnapshot) {
    throw new ApiError(500, "Unable to load the assigned bed snapshot.");
  }

  return bedSnapshot;
}

export async function applyAdmissionAction(
  input: OccupancyAdmissionActionInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const activeAdmission = await getActiveAdmissionById(input.id);

  if (!activeAdmission) {
    throw new ApiError(404, "Active admission not found.");
  }

  const currentBedId = activeAdmission.admissions.bedId;
  if (!currentBedId) {
    throw new ApiError(400, "Active admission does not have a bed assigned.");
  }

  if (input.action === "DISCHARGE") {
    await db.transaction(async (tx) => {
      await tx
        .update(admissions)
        .set({
          status: "DISCHARGED",
          dischargedAt: new Date(),
        })
        .where(eq(admissions.id, input.id));

      await tx
        .update(beds)
        .set({
          status: "CLEANING",
        })
        .where(eq(beds.id, currentBedId));
    });

    await recordAuditLog({
      actorUserId,
      action: "occupancy.bed.discharged",
      entityType: "admission",
      entityId: input.id,
      metadata: {
        patientId: activeAdmission.admissions.patientId,
        bedId: currentBedId,
      },
    });

    const bedSnapshot = await getOccupancyBedSnapshot(currentBedId);

    if (!bedSnapshot) {
      throw new ApiError(500, "Unable to load the discharged bed snapshot.");
    }

    return bedSnapshot;
  }

  if (!input.targetBedId) {
    throw new ApiError(400, "Select a target bed for transfer.");
  }

  if (input.targetBedId === currentBedId) {
    throw new ApiError(400, "Transfer target must be a different bed.");
  }

  const targetBed = await getBedById(input.targetBedId);

  if (!targetBed) {
    throw new ApiError(400, "Selected transfer bed does not exist.");
  }

  const activeAdmissionForTargetBed = await getActiveAdmissionByBedId(
    input.targetBedId,
  );
  assertBedEligibleForAdmission(targetBed, activeAdmissionForTargetBed);

  await db.transaction(async (tx) => {
    await tx
      .update(beds)
      .set({
        status: "CLEANING",
      })
      .where(eq(beds.id, currentBedId));

    await tx
      .update(beds)
      .set({
        status: "OCCUPIED",
      })
      .where(eq(beds.id, input.targetBedId as string));

    await tx
      .update(admissions)
      .set({
        bedId: input.targetBedId,
      })
      .where(eq(admissions.id, input.id));
  });

  await recordAuditLog({
    actorUserId,
    action: "occupancy.bed.transferred",
    entityType: "admission",
    entityId: input.id,
    metadata: {
      patientId: activeAdmission.admissions.patientId,
      fromBedId: currentBedId,
      toBedId: input.targetBedId,
    },
  });

  const targetSnapshot = await getOccupancyBedSnapshot(input.targetBedId);

  if (!targetSnapshot) {
    throw new ApiError(500, "Unable to load the transferred bed snapshot.");
  }

  return targetSnapshot;
}

export async function updateBedStatus(
  input: OccupancyBedStatusUpdateInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const currentBed = await getBedById(input.id);

  if (!currentBed) {
    throw new ApiError(404, "Bed not found.");
  }

  const activeAdmission = await getActiveAdmissionByBedId(input.id);

  if (activeAdmission && input.status !== "OCCUPIED") {
    throw new ApiError(
      400,
      "Beds with active admissions cannot be changed manually.",
    );
  }

  if (!activeAdmission && input.status === "OCCUPIED") {
    throw new ApiError(
      400,
      "Use the admission flow to mark a bed as occupied.",
    );
  }

  await db
    .update(beds)
    .set({
      status: input.status as BedStatus,
    })
    .where(eq(beds.id, input.id));

  await recordAuditLog({
    actorUserId,
    action: "occupancy.bed.status_updated",
    entityType: "bed",
    entityId: input.id,
    metadata: {
      previousStatus: currentBed.status,
      nextStatus: input.status,
    },
  });

  const bedSnapshot = await getOccupancyBedSnapshot(input.id);

  if (!bedSnapshot) {
    throw new ApiError(500, "Unable to load the updated bed snapshot.");
  }

  return bedSnapshot;
}
