import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { listAuditLogFeed } from "@/lib/audit/service";
import { auditLogFiltersSchema } from "@/lib/validators/audit";

export async function GET(request: NextRequest) {
  const guard = await requireApiPermissions(["audit.view"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const filters = auditLogFiltersSchema.parse({
      q: request.nextUrl.searchParams.get("q") ?? undefined,
      action: request.nextUrl.searchParams.get("action") ?? undefined,
      entityType: request.nextUrl.searchParams.get("entityType") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    });

    const payload = await listAuditLogFeed(filters);
    return NextResponse.json(payload);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
