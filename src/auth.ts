import NextAuth, { type NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";

import type { PermissionKey } from "@/constants/permissions";
import { ROLE_PERMISSIONS } from "@/constants/permissions";
import type { AppRole } from "@/constants/roles";
import { env } from "@/env";
import {
  fallbackDisplayName,
  resolveBootstrapRole,
  resolveUserAccess,
} from "@/lib/auth/permissions";
import { recordAuditLog } from "@/lib/audit/log";
import { logError } from "@/lib/observability/logger";
import { touchStaffAccessLogin } from "@/lib/staff-access/service";

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? null;
}

function buildDeniedRedirect(
  reason: "missing_email" | "not_allowlisted" | "access_lookup_failed",
  email?: string | null,
) {
  const params = new URLSearchParams({ reason });

  if (email) {
    params.set("email", email);
  }

  return `/access-denied?${params.toString()}`;
}

function applyBootstrapTokenFallback(
  token: JWT,
  email: string,
) {
  const bootstrapRole = resolveBootstrapRole(email);
  if (!bootstrapRole) {
    return token;
  }

  token.sub = typeof token.sub === "string" && token.sub.length > 0
    ? token.sub
    : `bootstrap:${email}`;
  token.email = email;
  token.name = typeof token.name === "string" && token.name.length > 0
    ? token.name
    : fallbackDisplayName(email);
  token.role = bootstrapRole;
  token.permissions = ROLE_PERMISSIONS[bootstrapRole];

  return token;
}

const authConfig = {
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  secret: env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/access-denied",
  },
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const normalizedEmail = normalizeEmail(user.email);

      if (!normalizedEmail) {
        try {
          await recordAuditLog({
            action: "auth.signIn.blocked",
            entityType: "auth_session",
            metadata: {
              reason: "missing_email",
            },
          });
        } catch (error) {
          logError("auth.sign_in.audit_log_failed", error, {
            reason: "missing_email",
          });
        }
        return buildDeniedRedirect("missing_email");
      }

      try {
        const resolvedAccess = await resolveUserAccess(normalizedEmail);
        if (!resolvedAccess) {
          try {
            await recordAuditLog({
              action: "auth.signIn.blocked",
              entityType: "auth_session",
              metadata: {
                email: normalizedEmail,
                reason: "not_allowlisted",
              },
            });
          } catch (error) {
            logError("auth.sign_in.audit_log_failed", error, {
              email: normalizedEmail,
              reason: "not_allowlisted",
            });
          }
        }

        return resolvedAccess
          ? true
          : buildDeniedRedirect("not_allowlisted", normalizedEmail);
      } catch (error) {
        logError("auth.sign_in.access_resolution_failed", error, {
          email: normalizedEmail,
        });
        if (resolveBootstrapRole(normalizedEmail)) {
          return true;
        }
        return buildDeniedRedirect("access_lookup_failed", normalizedEmail);
      }
    },
    async jwt({ token, user }) {
      const normalizedEmail = normalizeEmail(
        typeof user?.email === "string" ? user.email : token.email,
      );
      if (!normalizedEmail) {
        return token;
      }

      try {
        const resolvedAccess = await resolveUserAccess(normalizedEmail);
        if (!resolvedAccess) {
          const fallbackToken = applyBootstrapTokenFallback(token, normalizedEmail);
          if (fallbackToken.role) {
            return fallbackToken;
          }

          delete token.role;
          delete token.permissions;
          delete token.sub;
          return token;
        }

        token.sub = resolvedAccess.user.id;
        token.name = resolvedAccess.user.name ?? token.name;
        token.picture = resolvedAccess.user.image ?? token.picture;
        token.role = resolvedAccess.user.role;
        token.permissions = resolvedAccess.permissions;

        return token;
      } catch (error) {
        logError("auth.jwt_hydration_failed", error, {
          email: normalizedEmail,
        });
        return applyBootstrapTokenFallback(token, normalizedEmail);
      }
    },
    async session({ session, token }) {
      if (!session.user || !token.sub || !token.role) {
        return session;
      }

      session.user.id = token.sub;
      session.user.role = token.role as AppRole;
      session.user.permissions = (token.permissions ?? []) as PermissionKey[];
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      const normalizedEmail = normalizeEmail(user.email);
      if (!normalizedEmail) {
        return;
      }

      try {
        const resolvedAccess = await resolveUserAccess(normalizedEmail);

        if (resolvedAccess?.source === "bootstrap") {
          await recordAuditLog({
            actorUserId: resolvedAccess.user.id,
            action: "auth.signIn",
            entityType: "user",
            entityId: resolvedAccess.user.id,
            metadata: {
              email: normalizedEmail,
              source: "bootstrap",
            },
          });
          return;
        }

        await touchStaffAccessLogin(normalizedEmail);
      } catch (error) {
        logError("auth.sign_in.side_effects_failed", error, {
          email: normalizedEmail,
        });
        return;
      }
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
