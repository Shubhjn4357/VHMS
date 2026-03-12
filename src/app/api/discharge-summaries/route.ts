import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import {
  createDischargeSummary,
  listDischargeSummaries,
} from "@/lib/discharge/service";
import {
  createDischargeSummarySchema,
  dischargeFiltersSchema,
} from "@/lib/validators/discharge";

export async function GET(request: NextRequest) {
  const guard = await requireApiPermissions(["discharge.view"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const filters = dischargeFiltersSchema.parse({
      q: request.nextUrl.searchParams.get("q") ?? undefined,
      status: request.nextUrl.searchParams.get("status") ?? undefined,
    });

    const payload = await listDischargeSummaries(filters);
    return NextResponse.json(payload);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireApiPermissions(["discharge.create"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const payload = createDischargeSummarySchema.parse(await request.json());
    const createdSummary = await createDischargeSummary(
      payload,
      guard.session?.user.id,
    );

    return NextResponse.json(createdSummary, { status: 201 });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
