import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { updateNotificationItem } from "@/lib/communications/service";
import { notificationUpdateSchema } from "@/lib/validators/communications";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const guard = await requireApiPermissions(["communications.view"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const { id } = await context.params;
    const payload = notificationUpdateSchema.parse(await request.json());
    const updatedNotification = await updateNotificationItem(
      { id, ...payload },
      guard.session?.user.id,
    );

    return NextResponse.json(updatedNotification);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
