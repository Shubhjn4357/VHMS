import { NextRequest, NextResponse } from "next/server";

import { deleteDoctor, updateDoctor } from "@/lib/doctors/service";
import { runBulkAction } from "@/lib/api/bulk-actions";
import {
  guardDuplicateMutation,
  guardMutationRoute,
} from "@/lib/api/request-guard";
import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { bulkDoctorActionSchema } from "@/lib/validators/bulk-actions";

export async function POST(request: NextRequest) {
  const guard = await requireApiPermissions(["doctors.manage"]);

  if (guard.response) {
    return guard.response;
  }

  const limitedResponse = guardMutationRoute(
    request,
    "doctors-bulk",
    guard.session?.user.id,
  );
  if (limitedResponse) {
    return limitedResponse;
  }

  const duplicateResponse = guardDuplicateMutation(
    request,
    "doctors-bulk",
    guard.session?.user.id,
  );
  if (duplicateResponse) {
    return duplicateResponse;
  }

  try {
    const payload = bulkDoctorActionSchema.parse(await request.json());
    const result = payload.action === "delete"
      ? await runBulkAction(payload.ids, (id) =>
        deleteDoctor(id, guard.session?.user.id)
      )
      : await runBulkAction(payload.ids, (id) =>
        updateDoctor({ id, active: payload.active }, guard.session?.user.id)
      );

    return NextResponse.json(result);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
