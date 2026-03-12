import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { ApiError } from "@/lib/api/errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import {
  getDashboardLayout,
  resetDashboardLayout,
  saveDashboardLayout,
} from "@/lib/dashboard-layouts/service";
import {
  dashboardLayoutQuerySchema,
  updateDashboardLayoutSchema,
} from "@/lib/validators/dashboard-layouts";

export async function GET(request: NextRequest) {
  const guard = await requireApiPermissions(["dashboard.view"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const payload = dashboardLayoutQuerySchema.parse({
      layoutKey: request.nextUrl.searchParams.get("layoutKey") ?? undefined,
    });

    if (!guard.session?.user.id) {
      throw new ApiError(401, "Session user unavailable.");
    }

    const layout = await getDashboardLayout(
      guard.session.user.id,
      payload.layoutKey,
    );

    return NextResponse.json(layout);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  const guard = await requireApiPermissions(["dashboard.configure"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const payload = updateDashboardLayoutSchema.parse(await request.json());

    if (!guard.session?.user.id) {
      throw new ApiError(401, "Session user unavailable.");
    }

    const layout = await saveDashboardLayout(guard.session.user.id, payload);

    return NextResponse.json(layout);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  const guard = await requireApiPermissions(["dashboard.configure"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const payload = dashboardLayoutQuerySchema.parse({
      layoutKey: request.nextUrl.searchParams.get("layoutKey") ?? undefined,
    });

    if (!guard.session?.user.id) {
      throw new ApiError(401, "Session user unavailable.");
    }

    const layout = await resetDashboardLayout(
      guard.session.user.id,
      payload.layoutKey,
    );

    return NextResponse.json(layout);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
