import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { deleteCharge, updateCharge } from "@/lib/charges/service";
import { updateChargeSchema } from "@/lib/validators/charges";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const guard = await requireApiPermissions(["billing.create"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const { id } = await context.params;
    const payload = updateChargeSchema.parse(await request.json());
    const updatedCharge = await updateCharge(
      { id, ...payload },
      guard.session?.user.id,
    );

    return NextResponse.json(updatedCharge);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const guard = await requireApiPermissions(["billing.create"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const { id } = await context.params;
    const deletedCharge = await deleteCharge(id, guard.session?.user.id);

    return NextResponse.json(deletedCharge);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
