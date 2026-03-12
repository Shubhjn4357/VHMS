import { NextRequest, NextResponse } from "next/server";

import {
  guardDuplicateMutation,
  guardMutationRoute,
  guardReadRoute,
} from "@/lib/api/request-guard";
import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import {
  createAppointment,
  listAppointments,
} from "@/lib/appointments/service";
import {
  appointmentFiltersSchema,
  createAppointmentSchema,
} from "@/lib/validators/appointments";

export async function GET(request: NextRequest) {
  const guard = await requireApiPermissions(["appointments.view"]);

  if (guard.response) {
    return guard.response;
  }

  const limitedResponse = guardReadRoute(
    request,
    "appointments",
    guard.session?.user.id,
  );
  if (limitedResponse) {
    return limitedResponse;
  }

  try {
    const filters = appointmentFiltersSchema.parse({
      q: request.nextUrl.searchParams.get("q") ?? undefined,
      status: request.nextUrl.searchParams.get("status") ?? undefined,
    });

    const payload = await listAppointments(filters);
    return NextResponse.json(payload);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireApiPermissions(["appointments.create"]);

  if (guard.response) {
    return guard.response;
  }

  const limitedResponse = guardMutationRoute(
    request,
    "appointments",
    guard.session?.user.id,
  );
  if (limitedResponse) {
    return limitedResponse;
  }
  const duplicateResponse = guardDuplicateMutation(
    request,
    "appointments",
    guard.session?.user.id,
  );
  if (duplicateResponse) {
    return duplicateResponse;
  }

  try {
    const payload = createAppointmentSchema.parse(await request.json());
    const createdAppointment = await createAppointment(
      payload,
      guard.session?.user.id,
    );

    return NextResponse.json(createdAppointment, { status: 201 });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
