import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { deleteRoom, updateRoom } from "@/lib/wards/service";
import { updateRoomSchema } from "@/lib/validators/wards";

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
    const payload = updateRoomSchema.parse(await request.json());
    const updatedRoom = await updateRoom(
      { id, ...payload },
      guard.session?.user.id,
    );

    return NextResponse.json(updatedRoom);
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
    const deletedRoom = await deleteRoom(id, guard.session?.user.id);

    return NextResponse.json(deletedRoom);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
