"use client";

import type { PermissionKey } from "@/constants/permissions";
import { useAuthUser } from "@/hooks/useAuthUser";
import { hasEveryPermission } from "@/lib/permissions/ability";

export function useModuleAccess(requiredPermissions: PermissionKey[]) {
  const { user, isAuthenticated, isLoading } = useAuthUser();
  const permissions = user?.permissions ?? [];

  return {
    isAuthenticated,
    isLoading,
    permissions,
    canAccess: hasEveryPermission(permissions, requiredPermissions),
  };
}
