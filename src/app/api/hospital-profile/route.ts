import { NextRequest, NextResponse } from "next/server";

import { guardMutationRoute, guardReadRoute } from "@/lib/api/request-guard";
import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import {
  getHospitalProfile,
  updateHospitalProfile,
} from "@/lib/hospital/service";
import { updateHospitalProfileSchema } from "@/lib/validators/hospital";

export async function GET(request: NextRequest) {
  const guard = await requireApiPermissions(["settings.view"]);

  if (guard.response) {
    return guard.response;
  }

  const limitedResponse = guardReadRoute(
    request,
    "hospital-profile",
    guard.session?.user.id,
  );
  if (limitedResponse) {
    return limitedResponse;
  }

  try {
    const payload = await getHospitalProfile();
    return NextResponse.json(payload);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  const guard = await requireApiPermissions(["settings.manage"]);

  if (guard.response) {
    return guard.response;
  }

  const limitedResponse = guardMutationRoute(
    request,
    "hospital-profile",
    guard.session?.user.id,
  );
  if (limitedResponse) {
    return limitedResponse;
  }

  try {
    const payload = updateHospitalProfileSchema.parse(await request.json());
    const updatedProfile = await updateHospitalProfile(
      payload,
      guard.session?.user.id,
    );
    return NextResponse.json(updatedProfile);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
