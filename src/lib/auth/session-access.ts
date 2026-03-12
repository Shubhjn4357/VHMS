import { ROLE_PERMISSIONS, type PermissionKey } from "@/constants/permissions";
import { APP_ROLES, type AppRole } from "@/constants/roles";
import { bootstrapAccess } from "@/env";
import { resolveBootstrapRole } from "@/lib/auth/permissions";

type SessionLikeUser = {
  email?: string | null;
  permissions?: PermissionKey[] | null;
  role?: string | null;
};

function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" &&
    (APP_ROLES as readonly string[]).includes(value);
}

export function resolveSessionPermissions(
  user: SessionLikeUser | null | undefined,
  access = bootstrapAccess,
) {
  const normalizedEmail = user?.email?.trim().toLowerCase();
  const sessionRole = isAppRole(user?.role) ? user.role : null;
  const fallbackRole = normalizedEmail
    ? resolveBootstrapRole(normalizedEmail, access)
    : null;
  const effectiveRole = sessionRole ?? fallbackRole;

  if (user?.permissions?.length) {
    return user.permissions;
  }

  return effectiveRole ? ROLE_PERMISSIONS[effectiveRole] : [];
}
