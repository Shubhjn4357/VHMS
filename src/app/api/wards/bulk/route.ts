import { NextRequest, NextResponse } from "next/server";

import {
  deleteBed,
  deleteRoom,
  deleteWard,
  updateBed,
} from "@/lib/wards/service";
import { runBulkAction } from "@/lib/api/bulk-actions";
import {
  guardDuplicateMutation,
  guardMutationRoute,
} from "@/lib/api/request-guard";
import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { bulkWardActionSchema } from "@/lib/validators/bulk-actions";

export async function POST(request: NextRequest) {
  const guard = await requireApiPermissions(["wards.manage"]);

  if (guard.response) {
    return guard.response;
  }

  const limitedResponse = guardMutationRoute(
    request,
    "wards-bulk",
    guard.session?.user.id,
  );
  if (limitedResponse) {
    return limitedResponse;
  }

  const duplicateResponse = guardDuplicateMutation(
    request,
    "wards-bulk",
    guard.session?.user.id,
  );
  if (duplicateResponse) {
    return duplicateResponse;
  }

  try {
    const payload = bulkWardActionSchema.parse(await request.json());
    let result;

    if (payload.action === "delete" && payload.entity === "ward") {
      result = await runBulkAction(payload.ids, (id) =>
        deleteWard(id, guard.session?.user.id)
      );
    } else if (payload.action === "delete" && payload.entity === "room") {
      result = await runBulkAction(payload.ids, (id) =>
        deleteRoom(id, guard.session?.user.id)
      );
    } else if (payload.action === "delete" && payload.entity === "bed") {
      result = await runBulkAction(payload.ids, (id) =>
        deleteBed(id, guard.session?.user.id)
      );
    } else if (payload.action === "bedStatus") {
      result = await runBulkAction(payload.ids, (id) =>
        updateBed({ id, status: payload.status }, guard.session?.user.id)
      );
    } else {
      return NextResponse.json({ message: "Unsupported ward bulk action." }, {
        status: 400,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
