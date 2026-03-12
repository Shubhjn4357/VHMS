import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { deletePatient, updatePatient } from "@/lib/patients/service";
import { updatePatientSchema } from "@/lib/validators/patients";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const guard = await requireApiPermissions(["patients.update"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const { id } = await context.params;
    const payload = updatePatientSchema.parse(await request.json());
    const updatedPatient = await updatePatient(
      { id, ...payload },
      guard.session?.user.id,
    );

    return NextResponse.json(updatedPatient);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  const guard = await requireApiPermissions(["patients.update"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const { id } = await context.params;
    const deletedPatient = await deletePatient(id, guard.session?.user.id);

    return NextResponse.json(deletedPatient);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
