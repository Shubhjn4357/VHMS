import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { createAnnouncement } from "@/lib/communications/service";
import { createAnnouncementSchema } from "@/lib/validators/communications";

export async function POST(request: NextRequest) {
  const guard = await requireApiPermissions(["communications.send"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const payload = createAnnouncementSchema.parse(await request.json());
    const createdAnnouncement = await createAnnouncement(
      payload,
      guard.session?.user.id,
    );

    return NextResponse.json(createdAnnouncement, { status: 201 });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
