import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { updateMessageQueueStatus } from "@/lib/communications/service";
import { messageQueueActionSchema } from "@/lib/validators/communications";

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
    const payload = messageQueueActionSchema.parse(await request.json());
    const updatedQueue = await updateMessageQueueStatus(
      { id, ...payload },
      guard.session?.user.id,
    );

    return NextResponse.json(updatedQueue);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
