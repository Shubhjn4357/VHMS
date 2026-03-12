import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { listOccupancyBoard } from "@/lib/occupancy/service";
import { occupancyFiltersSchema } from "@/lib/validators/occupancy";

export async function GET(request: NextRequest) {
  const guard = await requireApiPermissions(["occupancy.view"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const filters = occupancyFiltersSchema.parse({
      q: request.nextUrl.searchParams.get("q") ?? undefined,
      wardId: request.nextUrl.searchParams.get("wardId") ?? undefined,
      status: request.nextUrl.searchParams.get("status") ?? undefined,
    });

    const payload = await listOccupancyBoard(filters);
    return NextResponse.json(payload);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
