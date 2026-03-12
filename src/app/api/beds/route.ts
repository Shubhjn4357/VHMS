import { NextRequest, NextResponse } from "next/server";

import {
  guardDuplicateMutation,
  guardMutationRoute,
} from "@/lib/api/request-guard";
import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { createBed } from "@/lib/wards/service";
import { createBedSchema } from "@/lib/validators/wards";

export async function POST(request: NextRequest) {
  const guard = await requireApiPermissions(["wards.manage"]);

  if (guard.response) {
    return guard.response;
  }

  const limitedResponse = guardMutationRoute(request, "beds", guard.session?.user.id);
  if (limitedResponse) {
    return limitedResponse;
  }
  const duplicateResponse = guardDuplicateMutation(
    request,
    "beds",
    guard.session?.user.id,
  );
  if (duplicateResponse) {
    return duplicateResponse;
  }

  try {
    const payload = createBedSchema.parse(await request.json());
    const createdBed = await createBed(payload, guard.session?.user.id);

    return NextResponse.json(createdBed, { status: 201 });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
