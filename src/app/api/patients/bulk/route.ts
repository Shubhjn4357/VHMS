import { NextRequest, NextResponse } from "next/server";

import { deletePatient } from "@/lib/patients/service";
import { runBulkAction } from "@/lib/api/bulk-actions";
import {
  guardDuplicateMutation,
  guardMutationRoute,
} from "@/lib/api/request-guard";
import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { bulkPatientDeleteSchema } from "@/lib/validators/bulk-actions";

export async function POST(request: NextRequest) {
  const guard = await requireApiPermissions(["patients.update"]);

  if (guard.response) {
    return guard.response;
  }

  const limitedResponse = guardMutationRoute(
    request,
    "patients-bulk",
    guard.session?.user.id,
  );
  if (limitedResponse) {
    return limitedResponse;
  }

  const duplicateResponse = guardDuplicateMutation(
    request,
    "patients-bulk",
    guard.session?.user.id,
  );
  if (duplicateResponse) {
    return duplicateResponse;
  }

  try {
    const payload = bulkPatientDeleteSchema.parse(await request.json());
    const result = await runBulkAction(payload.ids, (id) =>
      deletePatient(id, guard.session?.user.id)
    );

    return NextResponse.json(result);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
