import type { PermissionKey } from "@/constants/permissions";

export const hasPermission = (
  userPermissions: PermissionKey[],
  permission: PermissionKey,
) => userPermissions.includes(permission);

export const hasEveryPermission = (
  userPermissions: PermissionKey[],
  requiredPermissions: PermissionKey[],
) =>
  requiredPermissions.every((permission) =>
    hasPermission(userPermissions, permission)
  );

export const hasSomePermission = (
  userPermissions: PermissionKey[],
  requiredPermissions: PermissionKey[],
) =>
  requiredPermissions.some((permission) =>
    hasPermission(userPermissions, permission)
  );
