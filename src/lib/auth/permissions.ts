import { eq } from "drizzle-orm";

import type { PermissionKey } from "@/constants/permissions";
import { ROLE_PERMISSIONS } from "@/constants/permissions";
import type { AppRole } from "@/constants/roles";
import { getDb } from "@/db/client";
import { staffAccess, userPermissionOverrides, users } from "@/db/schema";
import { bootstrapAccess } from "@/env";
import { parseStoredPermissions } from "@/lib/staff-access/service";

export function resolveBootstrapRole(
  email: string,
  access = bootstrapAccess,
): AppRole | null {
  if (access.superAdminEmails.includes(email)) {
    return "SUPER_ADMIN";
  }

  if (access.adminEmails.includes(email)) {
    return "ADMIN";
  }

  return null;
}

export function fallbackDisplayName(email: string) {
  const localPart = email.split("@")[0] ?? email;

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
}

async function syncResolvedUserAccess({
  email,
  displayName,
  role,
}: {
  email: string;
  displayName: string;
  role: AppRole;
}) {
  const db = getDb();

  await db
    .insert(users)
    .values({
      email,
      name: displayName,
      role,
      status: "ACTIVE",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name: displayName,
        role,
        status: "ACTIVE",
        updatedAt: new Date(),
      },
    });

  return db.query.users.findFirst({
    where: eq(users.email, email),
  });
}

async function resolvePermissionSet({
  userId,
  role,
  basePermissions,
}: {
  userId: string;
  role: AppRole;
  basePermissions: PermissionKey[];
}) {
  const db = getDb();
  const userRow = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!userRow) {
    return null;
  }

  const overrides = await db.query.userPermissionOverrides.findMany({
    where: eq(userPermissionOverrides.userId, userRow.id),
  });

  const permissionSet = new Set<PermissionKey>(
    basePermissions.length > 0 ? basePermissions : ROLE_PERMISSIONS[role],
  );

  for (const override of overrides) {
    const permission = override.permissionKey as PermissionKey;
    if (override.allowed) {
      permissionSet.add(permission);
    } else {
      permissionSet.delete(permission);
    }
  }

  return [...permissionSet];
}

export async function resolveUserAccess(email: string) {
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const bootstrapRole = resolveBootstrapRole(normalizedEmail);

  if (bootstrapRole) {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    const userRow = await syncResolvedUserAccess({
      email: normalizedEmail,
      displayName: existingUser?.name ?? fallbackDisplayName(normalizedEmail) ??
        normalizedEmail,
      role: bootstrapRole,
    });

    if (!userRow) {
      return null;
    }

    const permissions = await resolvePermissionSet({
      userId: userRow.id,
      role: bootstrapRole,
      basePermissions: ROLE_PERMISSIONS[bootstrapRole],
    });

    if (!permissions) {
      return null;
    }

    return {
      access: null,
      source: "bootstrap" as const,
      user: userRow,
      permissions,
    };
  }

  const accessRow = await db.query.staffAccess.findFirst({
    where: eq(staffAccess.email, normalizedEmail),
  });

  if (!accessRow || accessRow.status !== "APPROVED") {
    return null;
  }

  const userRow = await syncResolvedUserAccess({
    email: normalizedEmail,
    displayName: accessRow.displayName,
    role: accessRow.role,
  });

  if (!userRow) {
    return null;
  }

  const permissions = await resolvePermissionSet({
    userId: userRow.id,
    role: accessRow.role,
    basePermissions: parseStoredPermissions(accessRow.defaultPermissions),
  });

  if (!permissions) {
    return null;
  }

  return {
    access: accessRow,
    source: "staffAccess" as const,
    user: userRow,
    permissions,
  };
}
