import { desc, eq, inArray } from "drizzle-orm";

import { ALL_PERMISSIONS, type PermissionKey } from "@/constants/permissions";
import {
  STAFF_ACCESS_DEFAULTS,
  type StaffAccessStatus,
} from "@/constants/staffAccessDefaults";
import type { AppRole } from "@/constants/roles";
import { getDb } from "@/db/client";
import { staffAccess, users } from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/log";
import { ApiError } from "@/lib/api/errors";
import type {
  StaffAccessFilters,
  StaffAccessListResponse,
  StaffAccessRecord,
  StaffAccessUpdateInput,
  StaffAccessUpsertInput,
} from "@/types/staffAccess";

const validPermissionSet = new Set<PermissionKey>(ALL_PERMISSIONS);

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

export function normalizeStaffAccessEmail(email: string) {
  return email.trim().toLowerCase();
}

export function parseStoredPermissions(
  rawPermissions: string,
): PermissionKey[] {
  try {
    const parsed = JSON.parse(rawPermissions) as unknown[];

    return [
      ...new Set(
        parsed.filter(
          (value): value is PermissionKey =>
            typeof value === "string" &&
            validPermissionSet.has(value as PermissionKey),
        ),
      ),
    ];
  } catch {
    return [];
  }
}

export function resolveStaffAccessPermissionList(
  role: AppRole,
  providedPermissions?: PermissionKey[],
) {
  const defaultPermissions = STAFF_ACCESS_DEFAULTS[role]
    .defaultPermissions as PermissionKey[];

  if (!providedPermissions || providedPermissions.length === 0) {
    return defaultPermissions;
  }

  return [
    ...new Set(
      providedPermissions.filter((permission) =>
        validPermissionSet.has(permission)
      ),
    ),
  ];
}

async function syncUserFromStaffAccess(input: {
  email: string;
  displayName: string;
  role: AppRole;
  status: StaffAccessStatus;
}) {
  const db = getDb();

  if (input.status === "APPROVED") {
    await db
      .insert(users)
      .values({
        email: input.email,
        name: input.displayName,
        role: input.role,
        status: "ACTIVE",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          name: input.displayName,
          role: input.role,
          status: "ACTIVE",
          updatedAt: new Date(),
        },
      });

    return;
  }

  await db
    .update(users)
    .set({
      name: input.displayName,
      role: input.role,
      status: input.status === "REVOKED" ? "SUSPENDED" : "PENDING",
      updatedAt: new Date(),
    })
    .where(eq(users.email, input.email));
}

function toStaffAccessRecord(
  accessRow: typeof staffAccess.$inferSelect,
  userRow?: typeof users.$inferSelect,
): StaffAccessRecord {
  return {
    id: accessRow.id,
    email: accessRow.email,
    displayName: accessRow.displayName,
    role: accessRow.role,
    status: accessRow.status,
    defaultPermissions: parseStoredPermissions(accessRow.defaultPermissions),
    approvedAt: toIsoString(accessRow.approvedAt),
    lastLoginAt: toIsoString(accessRow.lastLoginAt),
    createdAt: accessRow.createdAt.toISOString(),
    updatedAt: accessRow.updatedAt.toISOString(),
    userId: userRow?.id ?? null,
    userStatus: userRow?.status ?? null,
  };
}

async function getStaffAccessRecordById(id: string) {
  const db = getDb();
  const [accessRow] = await db
    .select()
    .from(staffAccess)
    .where(eq(staffAccess.id, id))
    .limit(1);

  if (!accessRow) {
    return null;
  }

  const [userRow] = await db
    .select()
    .from(users)
    .where(eq(users.email, accessRow.email))
    .limit(1);

  return toStaffAccessRecord(accessRow, userRow);
}

function summarize(records: StaffAccessRecord[]) {
  return {
    total: records.length,
    approved: records.filter((record) => record.status === "APPROVED").length,
    pending: records.filter((record) => record.status === "PENDING").length,
    revoked: records.filter((record) => record.status === "REVOKED").length,
    activeUsers: records.filter((record) => record.userStatus === "ACTIVE")
      .length,
  };
}

export async function listStaffAccess(
  filters: StaffAccessFilters = {},
): Promise<StaffAccessListResponse> {
  const db = getDb();
  const accessRows = await db
    .select()
    .from(staffAccess)
    .orderBy(desc(staffAccess.updatedAt), desc(staffAccess.createdAt));

  const emails = [...new Set(accessRows.map((row) => row.email))];
  const userRows = emails.length > 0
    ? await db.select().from(users).where(inArray(users.email, emails))
    : [];

  const userMap = new Map(userRows.map((row) => [row.email, row]));
  const query = filters.q?.trim().toLowerCase() ?? "";
  const status = filters.status ?? "ALL";

  const entries = accessRows
    .map((row) => toStaffAccessRecord(row, userMap.get(row.email)))
    .filter((record) => {
      const matchesStatus = status === "ALL" || record.status === status;

      if (!matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        record.displayName,
        record.email,
        record.role,
        record.status,
        record.userStatus ?? "",
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

export async function createStaffAccessRecord(
  input: StaffAccessUpsertInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const email = normalizeStaffAccessEmail(input.email);

  const [existingRecord] = await db
    .select()
    .from(staffAccess)
    .where(eq(staffAccess.email, email))
    .limit(1);

  if (existingRecord) {
    throw new ApiError(409, "Staff access already exists for this email.");
  }

  const displayName = input.displayName.trim();
  const permissions = resolveStaffAccessPermissionList(
    input.role,
    input.defaultPermissions,
  );
  const now = new Date();

  await db.insert(staffAccess).values({
    email,
    displayName,
    role: input.role,
    status: input.status,
    defaultPermissions: JSON.stringify(permissions),
    invitedByUserId: actorUserId ?? null,
    approvedAt: input.status === "APPROVED" ? now : null,
    updatedAt: now,
  });

  await syncUserFromStaffAccess({
    email,
    displayName,
    role: input.role,
    status: input.status,
  });

  const [createdRecord] = await db
    .select()
    .from(staffAccess)
    .where(eq(staffAccess.email, email))
    .limit(1);

  if (!createdRecord) {
    throw new ApiError(500, "Unable to load the created staff access record.");
  }

  await recordAuditLog({
    actorUserId,
    action: "staffAccess.created",
    entityType: "staff_access",
    entityId: createdRecord.id,
    metadata: {
      email,
      role: input.role,
      status: input.status,
      permissionCount: permissions.length,
    },
  });

  return getStaffAccessRecordById(createdRecord.id);
}

export async function updateStaffAccessRecord(
  input: StaffAccessUpdateInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const [existingRecord] = await db
    .select()
    .from(staffAccess)
    .where(eq(staffAccess.id, input.id))
    .limit(1);

  if (!existingRecord) {
    throw new ApiError(404, "Staff access record not found.");
  }

  const nextRole = input.role ?? existingRecord.role;
  const nextStatus = input.status ?? existingRecord.status;
  const nextDisplayName = input.displayName?.trim() ??
    existingRecord.displayName;
  const nextPermissions = resolveStaffAccessPermissionList(
    nextRole,
    input.defaultPermissions ??
      (input.role
        ? undefined
        : parseStoredPermissions(existingRecord.defaultPermissions)),
  );

  await db
    .update(staffAccess)
    .set({
      displayName: nextDisplayName,
      role: nextRole,
      status: nextStatus,
      defaultPermissions: JSON.stringify(nextPermissions),
      approvedAt: nextStatus === "APPROVED"
        ? existingRecord.approvedAt ?? new Date()
        : existingRecord.approvedAt,
      updatedAt: new Date(),
    })
    .where(eq(staffAccess.id, input.id));

  await syncUserFromStaffAccess({
    email: existingRecord.email,
    displayName: nextDisplayName,
    role: nextRole,
    status: nextStatus,
  });

  await recordAuditLog({
    actorUserId,
    action: "staffAccess.updated",
    entityType: "staff_access",
    entityId: existingRecord.id,
    metadata: {
      email: existingRecord.email,
      role: nextRole,
      status: nextStatus,
      permissionCount: nextPermissions.length,
    },
  });

  return getStaffAccessRecordById(existingRecord.id);
}

export async function deleteStaffAccessRecord(
  id: string,
  actorUserId?: string | null,
) {
  const db = getDb();
  const [existingRecord] = await db
    .select()
    .from(staffAccess)
    .where(eq(staffAccess.id, id))
    .limit(1);

  if (!existingRecord) {
    throw new ApiError(404, "Staff access record not found.");
  }

  await db.delete(staffAccess).where(eq(staffAccess.id, id));
  await db
    .update(users)
    .set({
      status: "SUSPENDED",
      updatedAt: new Date(),
    })
    .where(eq(users.email, existingRecord.email));

  await recordAuditLog({
    actorUserId,
    action: "staffAccess.deleted",
    entityType: "staff_access",
    entityId: existingRecord.id,
    metadata: {
      email: existingRecord.email,
      role: existingRecord.role,
      status: existingRecord.status,
    },
  });
}

export async function touchStaffAccessLogin(email: string) {
  const db = getDb();
  const normalizedEmail = normalizeStaffAccessEmail(email);
  const [existingRecord] = await db
    .select()
    .from(staffAccess)
    .where(eq(staffAccess.email, normalizedEmail))
    .limit(1);

  if (!existingRecord) {
    return;
  }

  await db
    .update(staffAccess)
    .set({
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(staffAccess.id, existingRecord.id));

  await recordAuditLog({
    action: "auth.signIn",
    entityType: "staff_access",
    entityId: existingRecord.id,
    metadata: {
      email: normalizedEmail,
    },
  });
}
