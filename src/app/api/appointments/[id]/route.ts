import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiAnyPermission, requireApiPermissions } from "@/lib/auth/api-guard";
import { hasPermission } from "@/lib/permissions/ability";
import { deleteAppointment, updateAppointment } from "@/lib/appointments/service";
import { updateAppointmentSchema } from "@/lib/validators/appointments";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const guard = await requireApiAnyPermission([
    "appointments.update",
    "appointments.checkIn",
  ]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const payload = updateAppointmentSchema.parse(await request.json());
    const permissions = guard.session?.user.permissions ?? [];
    const isCheckInOnlyUpdate = Object.keys(payload).length === 1 &&
      payload.status === "CHECKED_IN";

    if (
      !hasPermission(permissions, "appointments.update") &&
      !(
        isCheckInOnlyUpdate &&
        hasPermission(permissions, "appointments.checkIn")
      )
    ) {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const { id } = await context.params;
    const updatedAppointment = await updateAppointment(
      { id, ...payload },
      guard.session?.user.id,
    );

    return NextResponse.json(updatedAppointment);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  const guard = await requireApiPermissions(["appointments.update"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const { id } = await context.params;
    const deletedAppointment = await deleteAppointment(
      id,
      guard.session?.user.id,
    );

    return NextResponse.json(deletedAppointment);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
