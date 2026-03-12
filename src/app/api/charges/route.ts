import { NextRequest, NextResponse } from "next/server";

import {
  guardDuplicateMutation,
  guardMutationRoute,
  guardReadRoute,
} from "@/lib/api/request-guard";
import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { createCharge, listCharges } from "@/lib/charges/service";
import {
  chargeFiltersSchema,
  createChargeSchema,
} from "@/lib/validators/charges";

export async function GET(request: NextRequest) {
  const guard = await requireApiPermissions(["billing.view"]);

  if (guard.response) {
    return guard.response;
  }

  const limitedResponse = guardReadRoute(request, "charges", guard.session?.user.id);
  if (limitedResponse) {
    return limitedResponse;
  }

  try {
    const filters = chargeFiltersSchema.parse({
      q: request.nextUrl.searchParams.get("q") ?? undefined,
      category: request.nextUrl.searchParams.get("category") ?? undefined,
      status: request.nextUrl.searchParams.get("status") ?? undefined,
    });

    const payload = await listCharges(filters);
    return NextResponse.json(payload);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireApiPermissions(["billing.create"]);

  if (guard.response) {
    return guard.response;
  }

  const limitedResponse = guardMutationRoute(request, "charges", guard.session?.user.id);
  if (limitedResponse) {
    return limitedResponse;
  }
  const duplicateResponse = guardDuplicateMutation(
    request,
    "charges",
    guard.session?.user.id,
  );
  if (duplicateResponse) {
    return duplicateResponse;
  }

  try {
    const payload = createChargeSchema.parse(await request.json());
    const createdCharge = await createCharge(payload, guard.session?.user.id);

    return NextResponse.json(createdCharge, { status: 201 });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
