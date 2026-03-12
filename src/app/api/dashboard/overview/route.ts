import { NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { listDashboardOverview } from "@/lib/analytics/service";

export async function GET() {
  const guard = await requireApiPermissions(["dashboard.view"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const payload = await listDashboardOverview();
    return NextResponse.json(payload);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
