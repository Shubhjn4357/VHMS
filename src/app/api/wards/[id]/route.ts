import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { deleteWard, updateWard } from "@/lib/wards/service";
import { updateWardSchema } from "@/lib/validators/wards";

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
    const payload = updateWardSchema.parse(await request.json());
    const updatedWard = await updateWard(
      { id, ...payload },
      guard.session?.user.id,
    );

    return NextResponse.json(updatedWard);
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
    const deletedWard = await deleteWard(id, guard.session?.user.id);

    return NextResponse.json(deletedWard);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
