import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { ROUTE_PERMISSIONS } from "@/constants/appRoutes";
import { type PermissionKey } from "@/constants/permissions";
import { resolveSessionPermissions } from "@/lib/auth/session-access";
import { hasEveryPermission } from "@/lib/permissions/ability";

export default auth((request) => {
  const pathname = request.nextUrl.pathname;
  const matchedRoute = Object.keys(ROUTE_PERMISSIONS)
    .sort((left, right) => right.length - left.length)
    .find(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    );

  if (!request.auth?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!matchedRoute) {
    return NextResponse.next();
  }

  const requiredPermissions =
    ROUTE_PERMISSIONS[matchedRoute] as PermissionKey[];
  const sessionPermissions = resolveSessionPermissions(request.auth.user);

  if (!hasEveryPermission(sessionPermissions, requiredPermissions)) {
    return NextResponse.redirect(new URL("/access-denied", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
