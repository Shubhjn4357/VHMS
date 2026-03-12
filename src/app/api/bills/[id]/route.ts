import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { settleBill } from "@/lib/billing/service";
import { settleBillSchema } from "@/lib/validators/billing";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const guard = await requireApiPermissions(["billing.finalize"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const { id } = await context.params;
    const payload = settleBillSchema.parse(await request.json());
    const updatedBill = await settleBill(
      { id, ...payload },
      guard.session?.user.id,
    );

    return NextResponse.json(updatedBill);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
