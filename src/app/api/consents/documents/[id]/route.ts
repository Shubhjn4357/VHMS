import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { updateConsentDocumentStatus } from "@/lib/consents/service";
import { updateConsentDocumentStatusSchema } from "@/lib/validators/consent";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const guard = await requireApiPermissions(["consents.finalize"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const { id } = await context.params;
    const payload = updateConsentDocumentStatusSchema.parse(
      await request.json(),
    );
    const updatedDocument = await updateConsentDocumentStatus(
      { id, ...payload },
      guard.session?.user.id,
    );

    return NextResponse.json(updatedDocument);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
