import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { deleteBed, updateBed } from "@/lib/wards/service";
import { updateBedSchema } from "@/lib/validators/wards";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const guard = await requireApiPermissions(["wards.manage"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const { id } = await context.params;
    const payload = updateBedSchema.parse(await request.json());
    const updatedBed = await updateBed(
      { id, ...payload },
      guard.session?.user.id,
    );

    return NextResponse.json(updatedBed);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const guard = await requireApiPermissions(["wards.manage"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const { id } = await context.params;
    const deletedBed = await deleteBed(id, guard.session?.user.id);

    return NextResponse.json(deletedBed);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
