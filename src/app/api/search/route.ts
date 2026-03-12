import { NextRequest, NextResponse } from "next/server";

import { guardReadRoute } from "@/lib/api/request-guard";
import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { listGlobalSearchResults } from "@/lib/search/service";
import { globalSearchSchema } from "@/lib/validators/search";

export async function GET(request: NextRequest) {
  const guard = await requireApiPermissions(["dashboard.view"]);

  if (guard.response) {
    return guard.response;
  }

  const limitedResponse = guardReadRoute(request, "search", guard.session?.user.id);
  if (limitedResponse) {
    return limitedResponse;
  }

  try {
    const payload = globalSearchSchema.parse({
      q: request.nextUrl.searchParams.get("q") ?? undefined,
    });
    const result = await listGlobalSearchResults({
      query: payload.q,
      permissions: guard.session?.user.permissions ?? [],
    });

    return NextResponse.json(result);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
