import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import {
  createConsentTemplate,
  listConsentWorkspace,
} from "@/lib/consents/service";
import {
  consentFiltersSchema,
  createConsentTemplateSchema,
} from "@/lib/validators/consent";

export async function GET(request: NextRequest) {
  const guard = await requireApiPermissions(["consents.view"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const filters = consentFiltersSchema.parse({
      q: request.nextUrl.searchParams.get("q") ?? undefined,
      status: request.nextUrl.searchParams.get("status") ?? undefined,
    });

    const payload = await listConsentWorkspace(filters);
    return NextResponse.json(payload);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireApiPermissions(["consents.create"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const payload = createConsentTemplateSchema.parse(await request.json());
    const createdTemplate = await createConsentTemplate(
      payload,
      guard.session?.user.id,
    );

    return NextResponse.json(createdTemplate, { status: 201 });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
