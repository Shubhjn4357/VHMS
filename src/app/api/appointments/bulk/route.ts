import { NextRequest, NextResponse } from "next/server";

import {
  deleteAppointment,
  updateAppointment,
} from "@/lib/appointments/service";
import { runBulkAction } from "@/lib/api/bulk-actions";
import {
  guardDuplicateMutation,
  guardMutationRoute,
} from "@/lib/api/request-guard";
import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { bulkAppointmentActionSchema } from "@/lib/validators/bulk-actions";

export async function POST(request: NextRequest) {
  const guard = await requireApiPermissions(["appointments.update"]);

  if (guard.response) {
    return guard.response;
  }

  const limitedResponse = guardMutationRoute(
    request,
    "appointments-bulk",
    guard.session?.user.id,
  );
  if (limitedResponse) {
    return limitedResponse;
  }

  const duplicateResponse = guardDuplicateMutation(
    request,
    "appointments-bulk",
    guard.session?.user.id,
  );
  if (duplicateResponse) {
    return duplicateResponse;
  }

  try {
    const payload = bulkAppointmentActionSchema.parse(await request.json());
    const result = payload.action === "delete"
      ? await runBulkAction(payload.ids, (id) =>
        deleteAppointment(id, guard.session?.user.id)
      )
      : await runBulkAction(payload.ids, (id) =>
        updateAppointment(
          { id, status: payload.status },
          guard.session?.user.id,
        )
      );

    return NextResponse.json(result);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
