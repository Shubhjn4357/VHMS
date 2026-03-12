import { NextRequest, NextResponse } from "next/server";

import {
  guardDuplicateMutation,
  guardMutationRoute,
  guardReadRoute,
} from "@/lib/api/request-guard";
import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { createBill, listBills } from "@/lib/billing/service";
import { billFiltersSchema, createBillSchema } from "@/lib/validators/billing";

export async function GET(request: NextRequest) {
  const guard = await requireApiPermissions(["billing.view"]);

  if (guard.response) {
    return guard.response;
  }

  const limitedResponse = guardReadRoute(request, "bills", guard.session?.user.id);
  if (limitedResponse) {
    return limitedResponse;
  }

  try {
    const filters = billFiltersSchema.parse({
      q: request.nextUrl.searchParams.get("q") ?? undefined,
      status: request.nextUrl.searchParams.get("status") ?? undefined,
    });

    const payload = await listBills(filters);
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

  const limitedResponse = guardMutationRoute(request, "bills", guard.session?.user.id);
  if (limitedResponse) {
    return limitedResponse;
  }
  const duplicateResponse = guardDuplicateMutation(
    request,
    "bills",
    guard.session?.user.id,
  );
  if (duplicateResponse) {
    return duplicateResponse;
  }

  try {
    const payload = createBillSchema.parse(await request.json());
    const createdBill = await createBill(payload, guard.session?.user.id);

    return NextResponse.json(createdBill, { status: 201 });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
