import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import {
  finalizeDischargeSummary,
  updateDischargeSummary,
} from "@/lib/discharge/service";
import {
  finalizeDischargeSummarySchema,
  updateDischargeSummarySchema,
} from "@/lib/validators/discharge";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const guard = await requireApiPermissions(["discharge.create"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const { id } = await context.params;
    const payload = await request.json();

    if (payload?.action === "FINALIZE") {
      finalizeDischargeSummarySchema.parse(payload);
      const finalizedSummary = await finalizeDischargeSummary(
        id,
        guard.session?.user.id,
      );

      return NextResponse.json(finalizedSummary);
    }

    const updatePayload = updateDischargeSummarySchema.parse(payload);
    const updatedSummary = await updateDischargeSummary(
      { id, ...updatePayload },
      guard.session?.user.id,
    );

    return NextResponse.json(updatedSummary);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
