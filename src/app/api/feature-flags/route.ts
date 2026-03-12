import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import {
  listFeatureFlagsWorkspace,
  updateFeatureFlag,
} from "@/lib/feature-flags/service";
import { updateFeatureFlagSchema } from "@/lib/validators/feature-flags";

export async function GET() {
  const guard = await requireApiPermissions(["settings.view"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const payload = await listFeatureFlagsWorkspace();
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

  try {
    const payload = updateFeatureFlagSchema.parse(await request.json());
    const updated = await updateFeatureFlag(payload, guard.session?.user.id);

    return NextResponse.json(updated);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
