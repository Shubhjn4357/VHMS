import type { DefaultSession } from "next-auth";

import type { PermissionKey } from "@/constants/permissions";
import type { AppRole } from "@/constants/roles";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: AppRole;
      permissions: PermissionKey[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AppRole;
    permissions?: PermissionKey[];
  }
}
