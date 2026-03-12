import { NextRequest, NextResponse } from "next/server";

import { guardReadRoute } from "@/lib/api/request-guard";
import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { lookupBarcode } from "@/lib/search/service";
import { barcodeLookupSchema } from "@/lib/validators/search";

export async function GET(request: NextRequest) {
  const guard = await requireApiPermissions(["dashboard.view"]);

  if (guard.response) {
    return guard.response;
  }

  const limitedResponse = guardReadRoute(request, "barcode", guard.session?.user.id);
  if (limitedResponse) {
    return limitedResponse;
  }

  try {
    const payload = barcodeLookupSchema.parse({
      code: request.nextUrl.searchParams.get("code") ?? undefined,
    });
    const result = await lookupBarcode({
      code: payload.code,
      permissions: guard.session?.user.permissions ?? [],
    });

    return NextResponse.json(result);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
