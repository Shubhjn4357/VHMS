import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { sendCommunication } from "@/lib/communications/service";
import { sendCommunicationSchema } from "@/lib/validators/communications";

export async function POST(request: NextRequest) {
  const guard = await requireApiPermissions(["communications.send"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const payload = sendCommunicationSchema.parse(await request.json());
    const createdLog = await sendCommunication(payload, guard.session?.user.id);

    return NextResponse.json(createdLog, { status: 201 });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
