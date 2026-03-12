import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { createCommunicationTemplate } from "@/lib/communications/service";
import { createCommunicationTemplateSchema } from "@/lib/validators/communications";

export async function POST(request: NextRequest) {
  const guard = await requireApiPermissions(["communications.send"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const payload = createCommunicationTemplateSchema.parse(
      await request.json(),
    );
    const createdTemplate = await createCommunicationTemplate(
      payload,
      guard.session?.user.id,
    );

    return NextResponse.json(createdTemplate, { status: 201 });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
