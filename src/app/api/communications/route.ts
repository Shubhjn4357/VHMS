import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { listCommunicationWorkspace } from "@/lib/communications/service";
import { communicationFiltersSchema } from "@/lib/validators/communications";

export async function GET(request: NextRequest) {
  const guard = await requireApiPermissions(["communications.view"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const filters = communicationFiltersSchema.parse({
      q: request.nextUrl.searchParams.get("q") ?? undefined,
      status: request.nextUrl.searchParams.get("status") ?? undefined,
    });

    const payload = await listCommunicationWorkspace(filters);
    return NextResponse.json(payload);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
