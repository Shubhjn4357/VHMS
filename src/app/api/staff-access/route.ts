import { NextRequest, NextResponse } from "next/server";

import {
  guardDuplicateMutation,
  guardMutationRoute,
  guardReadRoute,
} from "@/lib/api/request-guard";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { toRouteErrorResponse } from "@/lib/api/route-errors";
import {
  createStaffAccessSchema,
  staffAccessFiltersSchema,
} from "@/lib/validators/staff-access";
import {
  createStaffAccessRecord,
  listStaffAccess,
} from "@/lib/staff-access/service";

export async function GET(request: NextRequest) {
  const guard = await requireApiPermissions(["staffAccess.view"]);

  if (guard.response) {
    return guard.response;
  }

  const limitedResponse = guardReadRoute(
    request,
    "staff-access",
    guard.session?.user.id,
  );
  if (limitedResponse) {
    return limitedResponse;
  }

  try {
    const filters = staffAccessFiltersSchema.parse({
      q: request.nextUrl.searchParams.get("q") ?? undefined,
      status: request.nextUrl.searchParams.get("status") ?? undefined,
    });

    const payload = await listStaffAccess(filters);
    return NextResponse.json(payload);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireApiPermissions(["staffAccess.manage"]);

  if (guard.response) {
    return guard.response;
  }

  const limitedResponse = guardMutationRoute(
    request,
    "staff-access",
    guard.session?.user.id,
  );
  if (limitedResponse) {
    return limitedResponse;
  }
  const duplicateResponse = guardDuplicateMutation(
    request,
    "staff-access",
    guard.session?.user.id,
  );
  if (duplicateResponse) {
    return duplicateResponse;
  }

  try {
    const payload = createStaffAccessSchema.parse(await request.json());
    const createdRecord = await createStaffAccessRecord(
      payload,
      guard.session?.user.id,
    );

    return NextResponse.json(createdRecord, { status: 201 });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
