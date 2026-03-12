import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { updateConsentTemplate } from "@/lib/consents/service";
import { updateConsentTemplateSchema } from "@/lib/validators/consent";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const guard = await requireApiPermissions(["consents.create"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const { id } = await context.params;
    const payload = updateConsentTemplateSchema.parse(await request.json());
    const updatedTemplate = await updateConsentTemplate(
      { id, ...payload },
      guard.session?.user.id,
    );

    return NextResponse.json(updatedTemplate);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
