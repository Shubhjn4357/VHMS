import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { logInfo } from "@/lib/observability/logger";

const webVitalsPayloadSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  value: z.number(),
  rating: z.string().optional(),
  delta: z.number().optional(),
  navigationType: z.string().optional(),
  pathname: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const payload = webVitalsPayloadSchema.parse(await request.json());

    logInfo("web_vital.recorded", {
      ...payload,
      userAgent: request.headers.get("user-agent"),
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
