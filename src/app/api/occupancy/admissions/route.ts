import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { assignBedToPatient } from "@/lib/occupancy/service";
import { createOccupancyAssignmentSchema } from "@/lib/validators/occupancy";

export async function POST(request: NextRequest) {
  const guard = await requireApiPermissions(["occupancy.manage"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const payload = createOccupancyAssignmentSchema.parse(await request.json());
    const assignedBed = await assignBedToPatient(payload, guard.session?.user.id);

    return NextResponse.json(assignedBed, { status: 201 });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
