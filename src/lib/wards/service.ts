import { and, asc, eq, isNull } from "drizzle-orm";

import type { BedStatus } from "@/constants/bedStatus";
import { getDb } from "@/db/client";
import { admissions, beds, patients, rooms, wards } from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/log";
import { ApiError } from "@/lib/api/errors";
import type {
  BedUpdateInput,
  BedUpsertInput,
  RoomUpdateInput,
  RoomUpsertInput,
  WardManagementBedRecord,
  WardManagementFilters,
  WardManagementResponse,
  WardManagementRoomRecord,
  WardManagementSummary,
  WardManagementWardRecord,
  WardUpdateInput,
  WardUpsertInput,
} from "@/types/wardManagement";

type ActiveAdmissionRow = {
  bedId: string | null;
  patientName: string | null;
};

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

async function listActiveAdmissions() {
  const db = getDb();

  return db
    .select({
      bedId: admissions.bedId,
      patientName: patients.firstName,
      patientLastName: patients.lastName,
    })
    .from(admissions)
    .leftJoin(patients, eq(admissions.patientId, patients.id))
    .where(
      and(eq(admissions.status, "ADMITTED"), isNull(admissions.dischargedAt)),
    )
    .then((rows) =>
      rows.map<ActiveAdmissionRow>((row) => ({
        bedId: row.bedId,
        patientName: [row.patientName, row.patientLastName].filter(Boolean)
          .join(" ") || null,
      }))
    );
}

function toBedRecord({
  bed,
  room,
  ward,
  activeAdmission,
}: {
  bed: typeof beds.$inferSelect;
  room: typeof rooms.$inferSelect | null;
  ward: typeof wards.$inferSelect;
  activeAdmission?: ActiveAdmissionRow;
}): WardManagementBedRecord {
  return {
    id: bed.id,
    wardId: ward.id,
    wardName: ward.name,
    roomId: room?.id ?? null,
    roomNumber: room?.roomNumber ?? null,
    bedNumber: bed.bedNumber,
    status: bed.status,
    patientName: activeAdmission?.patientName ?? null,
    hasActiveAdmission: Boolean(activeAdmission?.bedId),
    createdAt: bed.createdAt.toISOString(),
  };
}

function summarizeEntries(entries: WardManagementWardRecord[]): WardManagementSummary {
  const roomsList = entries.flatMap((ward) => ward.rooms);
  const bedsList = roomsList.flatMap((room) => room.beds);

  return {
    totalWards: entries.length,
    totalRooms: roomsList.length,
    totalBeds: bedsList.length,
    occupiedBeds: bedsList.filter((bed) => bed.status === "OCCUPIED").length,
    availableBeds: bedsList.filter((bed) => bed.status === "FREE").length,
    blockedBeds: bedsList.filter((bed) => bed.status === "BLOCKED").length,
  };
}

async function getWardRowById(id: string) {
  const db = getDb();
  const [row] = await db.select().from(wards).where(eq(wards.id, id)).limit(1);
  return row ?? null;
}

async function getRoomRowById(id: string) {
  const db = getDb();
  const [row] = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
  return row ?? null;
}

async function getBedRowById(id: string) {
  const db = getDb();
  const [row] = await db.select().from(beds).where(eq(beds.id, id)).limit(1);
  return row ?? null;
}

async function ensureUniqueWardName(name: string, ignoreId?: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: wards.id })
    .from(wards)
    .where(eq(wards.name, name))
    .limit(1);

  if (row && row.id !== ignoreId) {
    throw new ApiError(409, "Another ward already uses this name.");
  }
}

async function ensureUniqueRoomNumber(roomNumber: string, ignoreId?: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(eq(rooms.roomNumber, roomNumber))
    .limit(1);

  if (row && row.id !== ignoreId) {
    throw new ApiError(409, "Another room already uses this room number.");
  }
}

async function ensureUniqueBedNumber(bedNumber: string, ignoreId?: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: beds.id })
    .from(beds)
    .where(eq(beds.bedNumber, bedNumber))
    .limit(1);

  if (row && row.id !== ignoreId) {
    throw new ApiError(409, "Another bed already uses this bed number.");
  }
}

async function requireWard(id: string) {
  const row = await getWardRowById(id);

  if (!row) {
    throw new ApiError(400, "Selected ward does not exist.");
  }

  return row;
}

async function requireRoom(id: string) {
  const row = await getRoomRowById(id);

  if (!row) {
    throw new ApiError(400, "Selected room does not exist.");
  }

  return row;
}

async function requireRoomInWard({
  roomId,
  wardId,
}: {
  roomId: string;
  wardId: string;
}) {
  const roomRow = await requireRoom(roomId);

  if (roomRow.wardId !== wardId) {
    throw new ApiError(
      400,
      "Selected room does not belong to the selected ward.",
    );
  }

  return roomRow;
}

async function getActiveAdmissionByBedId(bedId: string) {
  const rows = await listActiveAdmissions();
  return rows.find((row) => row.bedId === bedId) ?? null;
}

async function countBedsForRoom(roomId: string) {
  const db = getDb();
  const rows = await db
    .select({ id: beds.id })
    .from(beds)
    .where(eq(beds.roomId, roomId));

  return rows.length;
}

async function countRoomsForWard(wardId: string) {
  const db = getDb();
  const rows = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(eq(rooms.wardId, wardId));

  return rows.length;
}

async function countAdmissionsForBed(bedId: string) {
  const db = getDb();
  const rows = await db
    .select({ id: admissions.id })
    .from(admissions)
    .where(eq(admissions.bedId, bedId));

  return rows.length;
}

async function getWardRecordById(id: string) {
  const payload = await listWardManagement();
  return payload.entries.find((entry) => entry.id === id) ?? null;
}

async function getRoomRecordById(id: string) {
  const payload = await listWardManagement();

  for (const ward of payload.entries) {
    const room = ward.rooms.find((entry) => entry.id === id);
    if (room) {
      return room;
    }
  }

  return null;
}

async function getBedRecordById(id: string) {
  const payload = await listWardManagement();

  for (const ward of payload.entries) {
    for (const room of ward.rooms) {
      const bed = room.beds.find((entry) => entry.id === id);
      if (bed) {
        return bed;
      }
    }
  }

  return null;
}

export async function listWardManagement(
  filters: WardManagementFilters = {},
): Promise<WardManagementResponse> {
  const db = getDb();
  const [wardRows, roomRows, bedRows, activeAdmissionRows] = await Promise.all([
    db.select().from(wards).orderBy(asc(wards.name)),
    db.select().from(rooms).orderBy(asc(rooms.roomNumber)),
    db.select().from(beds).orderBy(asc(beds.bedNumber)),
    listActiveAdmissions(),
  ]);

  const query = filters.q?.trim().toLowerCase() ?? "";
  const roomRowsByWardId = roomRows.reduce((map, room) => {
    const rowsForWard = map.get(room.wardId ?? "") ?? [];
    rowsForWard.push(room);
    map.set(room.wardId ?? "", rowsForWard);
    return map;
  }, new Map<string, typeof rooms.$inferSelect[]>());
  const bedRowsByRoomId = bedRows.reduce((map, bed) => {
    const rowsForRoom = map.get(bed.roomId ?? "") ?? [];
    rowsForRoom.push(bed);
    map.set(bed.roomId ?? "", rowsForRoom);
    return map;
  }, new Map<string, typeof beds.$inferSelect[]>());
  const activeAdmissionsByBedId = new Map(
    activeAdmissionRows
      .filter((row) => Boolean(row.bedId))
      .map((row) => [row.bedId as string, row]),
  );

  const entries = wardRows
    .map<WardManagementWardRecord | null>((ward) => {
      if (filters.wardId && ward.id !== filters.wardId) {
        return null;
      }

      const wardMatches = !query ||
        includesQuery([ward.id, ward.name, ward.floor], query);
      const wardRooms = roomRowsByWardId.get(ward.id) ?? [];
      const roomRecords = wardRooms
        .map<WardManagementRoomRecord | null>((room) => {
          const roomMatches = !query ||
            includesQuery(
              [room.id, room.roomNumber, room.roomType, ward.name, ward.floor],
              query,
            );
          const roomBeds = (bedRowsByRoomId.get(room.id) ?? [])
            .map((bed) =>
              toBedRecord({
                bed,
                room,
                ward,
                activeAdmission: activeAdmissionsByBedId.get(bed.id),
              })
            )
            .filter((bed) => {
              const matchesStatus = !filters.status ||
                filters.status === "ALL" ||
                bed.status === filters.status;

              if (!matchesStatus) {
                return false;
              }

              if (!query || wardMatches || roomMatches) {
                return true;
              }

              return includesQuery(
                [
                  bed.id,
                  bed.bedNumber,
                  bed.status,
                  bed.patientName,
                  bed.roomNumber,
                  bed.wardName,
                ],
                query,
              );
            });

          if (!wardMatches && !roomMatches && roomBeds.length === 0) {
            return null;
          }

          return {
            id: room.id,
            wardId: ward.id,
            wardName: ward.name,
            roomNumber: room.roomNumber,
            roomType: room.roomType,
            dailyCharge: room.dailyCharge,
            totalBeds: roomBeds.length,
            occupiedBeds: roomBeds.filter((bed) => bed.status === "OCCUPIED")
              .length,
            availableBeds: roomBeds.filter((bed) => bed.status === "FREE")
              .length,
            createdAt: room.createdAt.toISOString(),
            beds: roomBeds,
          };
        })
        .filter((room): room is WardManagementRoomRecord => Boolean(room));

      if (!wardMatches && roomRecords.length === 0) {
        return null;
      }

      const wardBeds = roomRecords.flatMap((room) => room.beds);

      return {
        id: ward.id,
        name: ward.name,
        floor: ward.floor ?? null,
        totalRooms: roomRecords.length,
        totalBeds: wardBeds.length,
        occupiedBeds: wardBeds.filter((bed) => bed.status === "OCCUPIED")
          .length,
        availableBeds: wardBeds.filter((bed) => bed.status === "FREE").length,
        createdAt: ward.createdAt.toISOString(),
        rooms: roomRecords,
      };
    })
    .filter((entry): entry is WardManagementWardRecord => Boolean(entry));

  return {
    entries,
    summary: summarizeEntries(entries),
    filters: {
      q: query,
      wardId: filters.wardId ?? null,
      status: filters.status ?? "ALL",
    },
    directories: {
      wards: wardRows.map((ward) => ({
        id: ward.id,
        name: ward.name,
      })),
      rooms: roomRows
        .filter((room) =>
          !filters.wardId || room.wardId === filters.wardId
        )
        .map((room) => ({
          id: room.id,
          wardId: room.wardId ?? "",
          roomNumber: room.roomNumber,
        })),
    },
  };
}

export async function createWard(
  input: WardUpsertInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const name = normalizeRequired(input.name);
  await ensureUniqueWardName(name);

  const [createdRow] = await db
    .insert(wards)
    .values({
      name,
      floor: normalizeOptional(input.floor),
    })
    .returning({ id: wards.id });

  if (!createdRow) {
    throw new ApiError(500, "Unable to create the ward.");
  }

  await recordAuditLog({
    actorUserId,
    action: "wards.created",
    entityType: "ward",
    entityId: createdRow.id,
    metadata: {
      name,
      floor: normalizeOptional(input.floor),
    },
  });

  const createdRecord = await getWardRecordById(createdRow.id);

  if (!createdRecord) {
    throw new ApiError(500, "Unable to load the created ward.");
  }

  return createdRecord;
}

export async function updateWard(
  input: WardUpdateInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const existingRow = await getWardRowById(input.id);

  if (!existingRow) {
    throw new ApiError(404, "Ward not found.");
  }

  const nextName = input.name ? normalizeRequired(input.name) : existingRow.name;
  await ensureUniqueWardName(nextName, existingRow.id);

  await db
    .update(wards)
    .set({
      name: nextName,
      floor: input.floor !== undefined
        ? normalizeOptional(input.floor)
        : existingRow.floor,
    })
    .where(eq(wards.id, input.id));

  await recordAuditLog({
    actorUserId,
    action: "wards.updated",
    entityType: "ward",
    entityId: input.id,
    metadata: {
      previousName: existingRow.name,
      nextName,
    },
  });

  const updatedRecord = await getWardRecordById(input.id);

  if (!updatedRecord) {
    throw new ApiError(500, "Unable to load the updated ward.");
  }

  return updatedRecord;
}

export async function createRoom(
  input: RoomUpsertInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  await requireWard(input.wardId);
  const roomNumber = normalizeRequired(input.roomNumber);
  await ensureUniqueRoomNumber(roomNumber);

  const [createdRow] = await db
    .insert(rooms)
    .values({
      wardId: input.wardId,
      roomNumber,
      roomType: normalizeRequired(input.roomType),
      dailyCharge: input.dailyCharge,
    })
    .returning({ id: rooms.id });

  if (!createdRow) {
    throw new ApiError(500, "Unable to create the room.");
  }

  await recordAuditLog({
    actorUserId,
    action: "wards.room.created",
    entityType: "room",
    entityId: createdRow.id,
    metadata: {
      wardId: input.wardId,
      roomNumber,
      roomType: input.roomType,
      dailyCharge: input.dailyCharge,
    },
  });

  const createdRecord = await getRoomRecordById(createdRow.id);

  if (!createdRecord) {
    throw new ApiError(500, "Unable to load the created room.");
  }

  return createdRecord;
}

export async function updateRoom(
  input: RoomUpdateInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const existingRow = await getRoomRowById(input.id);

  if (!existingRow) {
    throw new ApiError(404, "Room not found.");
  }

  const nextWardId = input.wardId ?? existingRow.wardId;
  const nextRoomNumber = input.roomNumber
    ? normalizeRequired(input.roomNumber)
    : existingRow.roomNumber;

  if (!nextWardId) {
    throw new ApiError(400, "Room must be mapped to a ward.");
  }

  await requireWard(nextWardId);
  await ensureUniqueRoomNumber(nextRoomNumber, existingRow.id);

  if (nextWardId !== existingRow.wardId) {
    const existingBedCount = await countBedsForRoom(existingRow.id);

    if (existingBedCount > 0) {
      throw new ApiError(
        400,
        "Move or recreate the room's beds before remapping it to another ward.",
      );
    }
  }

  await db
    .update(rooms)
    .set({
      wardId: nextWardId,
      roomNumber: nextRoomNumber,
      roomType: input.roomType
        ? normalizeRequired(input.roomType)
        : existingRow.roomType,
      dailyCharge: input.dailyCharge ?? existingRow.dailyCharge,
    })
    .where(eq(rooms.id, input.id));

  await recordAuditLog({
    actorUserId,
    action: "wards.room.updated",
    entityType: "room",
    entityId: input.id,
    metadata: {
      previousWardId: existingRow.wardId,
      nextWardId,
      roomNumber: nextRoomNumber,
    },
  });

  const updatedRecord = await getRoomRecordById(input.id);

  if (!updatedRecord) {
    throw new ApiError(500, "Unable to load the updated room.");
  }

  return updatedRecord;
}

function assertMasterBedStatus(status: BedStatus) {
  if (status === "OCCUPIED") {
    throw new ApiError(
      400,
      "Bed masters cannot be created or updated directly to occupied.",
    );
  }
}

export async function createBed(
  input: BedUpsertInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  await requireWard(input.wardId);
  await requireRoomInWard({
    roomId: input.roomId,
    wardId: input.wardId,
  });
  const bedNumber = normalizeRequired(input.bedNumber);
  assertMasterBedStatus(input.status);
  await ensureUniqueBedNumber(bedNumber);

  const [createdRow] = await db
    .insert(beds)
    .values({
      wardId: input.wardId,
      roomId: input.roomId,
      bedNumber,
      status: input.status,
    })
    .returning({ id: beds.id });

  if (!createdRow) {
    throw new ApiError(500, "Unable to create the bed.");
  }

  await recordAuditLog({
    actorUserId,
    action: "wards.bed.created",
    entityType: "bed",
    entityId: createdRow.id,
    metadata: {
      wardId: input.wardId,
      roomId: input.roomId,
      bedNumber,
      status: input.status,
    },
  });

  const createdRecord = await getBedRecordById(createdRow.id);

  if (!createdRecord) {
    throw new ApiError(500, "Unable to load the created bed.");
  }

  return createdRecord;
}

export async function updateBed(
  input: BedUpdateInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const existingRow = await getBedRowById(input.id);

  if (!existingRow) {
    throw new ApiError(404, "Bed not found.");
  }

  const activeAdmission = await getActiveAdmissionByBedId(input.id);
  const nextRoomId = input.roomId ?? existingRow.roomId;
  const nextWardId = input.wardId ?? existingRow.wardId;
  const nextBedNumber = input.bedNumber
    ? normalizeRequired(input.bedNumber)
    : existingRow.bedNumber;
  const nextStatus = input.status ?? existingRow.status;

  if (!nextRoomId || !nextWardId) {
    throw new ApiError(400, "Bed must stay mapped to a ward and room.");
  }

  await requireWard(nextWardId);
  await requireRoomInWard({
    roomId: nextRoomId,
    wardId: nextWardId,
  });
  await ensureUniqueBedNumber(nextBedNumber, existingRow.id);

  if (input.status) {
    assertMasterBedStatus(input.status);
  }

  if (
    activeAdmission &&
    (
      nextRoomId !== existingRow.roomId ||
      nextWardId !== existingRow.wardId ||
      nextStatus !== existingRow.status
    )
  ) {
    throw new ApiError(
      400,
      "Beds with active admissions cannot be remapped or re-stated from the master.",
    );
  }

  await db
    .update(beds)
    .set({
      wardId: nextWardId,
      roomId: nextRoomId,
      bedNumber: nextBedNumber,
      status: nextStatus,
    })
    .where(eq(beds.id, input.id));

  await recordAuditLog({
    actorUserId,
    action: "wards.bed.updated",
    entityType: "bed",
    entityId: input.id,
    metadata: {
      previousRoomId: existingRow.roomId,
      nextRoomId,
      previousWardId: existingRow.wardId,
      nextWardId,
      previousStatus: existingRow.status,
      nextStatus,
    },
  });

  const updatedRecord = await getBedRecordById(input.id);

  if (!updatedRecord) {
    throw new ApiError(500, "Unable to load the updated bed.");
  }

  return updatedRecord;
}

export async function deleteWard(
  id: string,
  actorUserId?: string | null,
) {
  const db = getDb();
  const existingRow = await getWardRowById(id);

  if (!existingRow) {
    throw new ApiError(404, "Ward not found.");
  }

  const roomCount = await countRoomsForWard(id);
  if (roomCount > 0) {
    throw new ApiError(
      409,
      "Remove or move the ward's rooms before deleting the ward.",
    );
  }

  await db.delete(wards).where(eq(wards.id, id));

  await recordAuditLog({
    actorUserId,
    action: "wards.deleted",
    entityType: "ward",
    entityId: id,
    metadata: {
      name: existingRow.name,
    },
  });

  return { id };
}

export async function deleteRoom(
  id: string,
  actorUserId?: string | null,
) {
  const db = getDb();
  const existingRow = await getRoomRowById(id);

  if (!existingRow) {
    throw new ApiError(404, "Room not found.");
  }

  const bedCount = await countBedsForRoom(id);
  if (bedCount > 0) {
    throw new ApiError(
      409,
      "Remove or move the room's beds before deleting the room.",
    );
  }

  await db.delete(rooms).where(eq(rooms.id, id));

  await recordAuditLog({
    actorUserId,
    action: "wards.room.deleted",
    entityType: "room",
    entityId: id,
    metadata: {
      roomNumber: existingRow.roomNumber,
      wardId: existingRow.wardId,
    },
  });

  return { id };
}

export async function deleteBed(
  id: string,
  actorUserId?: string | null,
) {
  const db = getDb();
  const existingRow = await getBedRowById(id);

  if (!existingRow) {
    throw new ApiError(404, "Bed not found.");
  }

  const activeAdmission = await getActiveAdmissionByBedId(id);
  if (activeAdmission) {
    throw new ApiError(
      409,
      "Beds with active admissions cannot be deleted.",
    );
  }

  const admissionCount = await countAdmissionsForBed(id);
  if (admissionCount > 0) {
    throw new ApiError(
      409,
      "Beds used in admission history cannot be deleted.",
    );
  }

  await db.delete(beds).where(eq(beds.id, id));

  await recordAuditLog({
    actorUserId,
    action: "wards.bed.deleted",
    entityType: "bed",
    entityId: id,
    metadata: {
      bedNumber: existingRow.bedNumber,
      roomId: existingRow.roomId,
      wardId: existingRow.wardId,
    },
  });

  return { id };
}
