import { NextRequest, NextResponse } from "next/server";

import { requireApiPermissions } from "@/lib/auth/api-guard";
import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { updateStaffAccessSchema } from "@/lib/validators/staff-access";
import {
  deleteStaffAccessRecord,
  updateStaffAccessRecord,
} from "@/lib/staff-access/service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const guard = await requireApiPermissions(["staffAccess.manage"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const { id } = await context.params;
    const payload = updateStaffAccessSchema.parse(await request.json());
    const updatedRecord = await updateStaffAccessRecord(
      { id, ...payload },
      guard.session?.user.id,
    );

    return NextResponse.json(updatedRecord);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  const guard = await requireApiPermissions(["staffAccess.manage"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const { id } = await context.params;
    await deleteStaffAccessRecord(id, guard.session?.user.id);

    return NextResponse.json({ id, success: true });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
