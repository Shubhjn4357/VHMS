import { NextRequest, NextResponse } from "next/server";

import {
  guardDuplicateMutation,
  guardMutationRoute,
  guardReadRoute,
} from "@/lib/api/request-guard";
import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { createWard, listWardManagement } from "@/lib/wards/service";
import {
  createWardSchema,
  wardManagementFiltersSchema,
} from "@/lib/validators/wards";

export async function GET(request: NextRequest) {
  const guard = await requireApiPermissions(["wards.view"]);

  if (guard.response) {
    return guard.response;
  }

  const limitedResponse = guardReadRoute(request, "wards", guard.session?.user.id);
  if (limitedResponse) {
    return limitedResponse;
  }

  try {
    const filters = wardManagementFiltersSchema.parse({
      q: request.nextUrl.searchParams.get("q") ?? undefined,
      wardId: request.nextUrl.searchParams.get("wardId") ?? undefined,
      status: request.nextUrl.searchParams.get("status") ?? undefined,
    });

    const payload = await listWardManagement(filters);
    return NextResponse.json(payload);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireApiPermissions(["wards.manage"]);

  if (guard.response) {
    return guard.response;
  }

  const limitedResponse = guardMutationRoute(request, "wards", guard.session?.user.id);
  if (limitedResponse) {
    return limitedResponse;
  }
  const duplicateResponse = guardDuplicateMutation(
    request,
    "wards",
    guard.session?.user.id,
  );
  if (duplicateResponse) {
    return duplicateResponse;
  }

  try {
    const payload = createWardSchema.parse(await request.json());
    const createdWard = await createWard(payload, guard.session?.user.id);

    return NextResponse.json(createdWard, { status: 201 });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
