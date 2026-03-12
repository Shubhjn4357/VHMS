import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { deleteDoctor, updateDoctor } from "@/lib/doctors/service";
import { updateDoctorSchema } from "@/lib/validators/doctors";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const guard = await requireApiPermissions(["doctors.manage"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const { id } = await context.params;
    const payload = updateDoctorSchema.parse(await request.json());
    const updatedDoctor = await updateDoctor(
      { id, ...payload },
      guard.session?.user.id,
    );

    return NextResponse.json(updatedDoctor);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const guard = await requireApiPermissions(["doctors.manage"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const { id } = await context.params;
    const deletedDoctor = await deleteDoctor(id, guard.session?.user.id);

    return NextResponse.json(deletedDoctor);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
