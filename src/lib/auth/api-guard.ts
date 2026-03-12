import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { PermissionKey } from "@/constants/permissions";
import {
  hasEveryPermission,
  hasSomePermission,
} from "@/lib/permissions/ability";

export async function requireApiPermissions(
  requiredPermissions: PermissionKey[],
) {
  const session = await auth();

  if (!session?.user) {
    return {
      response: NextResponse.json({ message: "Unauthorized." }, {
        status: 401,
      }),
      session: null,
    };
  }

  const permissions = session.user.permissions ?? [];

  if (!hasEveryPermission(permissions, requiredPermissions)) {
    return {
      response: NextResponse.json({ message: "Forbidden." }, { status: 403 }),
      session: null,
    };
  }

  return { response: null, session };
}

export async function requireApiAnyPermission(
  requiredPermissions: PermissionKey[],
) {
  const session = await auth();

  if (!session?.user) {
    return {
      response: NextResponse.json({ message: "Unauthorized." }, {
        status: 401,
      }),
      session: null,
    };
  }

  const permissions = session.user.permissions ?? [];

  if (!hasSomePermission(permissions, requiredPermissions)) {
    return {
      response: NextResponse.json({ message: "Forbidden." }, { status: 403 }),
      session: null,
    };
  }

  return { response: null, session };
}
