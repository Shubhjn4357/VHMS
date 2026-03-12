import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ApiError } from "@/lib/api/errors";
import { logError } from "@/lib/observability/logger";

export function toRouteErrorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        message: "Invalid request payload.",
        issues: error.flatten(),
      },
      { status: 400 },
    );
  }

  if (error instanceof ApiError) {
    return NextResponse.json({ message: error.message }, {
      status: error.status,
    });
  }

  logError("api.route_error", error);
  return NextResponse.json(
    { message: "Unexpected server error." },
    { status: 500 },
  );
}
