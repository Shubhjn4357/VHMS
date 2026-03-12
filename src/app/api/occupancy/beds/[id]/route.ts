import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { updateBedStatus } from "@/lib/occupancy/service";
import { updateBedStatusSchema } from "@/lib/validators/occupancy";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const guard = await requireApiPermissions(["occupancy.manage"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const { id } = await context.params;
    const payload = updateBedStatusSchema.parse(await request.json());
    const updatedBed = await updateBedStatus(
      { id, ...payload },
      guard.session?.user.id,
    );

    return NextResponse.json(updatedBed);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
