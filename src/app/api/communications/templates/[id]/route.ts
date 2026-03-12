import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { updateCommunicationTemplate } from "@/lib/communications/service";
import { updateCommunicationTemplateSchema } from "@/lib/validators/communications";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const guard = await requireApiPermissions(["communications.send"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const { id } = await context.params;
    const payload = updateCommunicationTemplateSchema.parse(
      await request.json(),
    );
    const updatedTemplate = await updateCommunicationTemplate(
      { id, ...payload },
      guard.session?.user.id,
    );

    return NextResponse.json(updatedTemplate);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
