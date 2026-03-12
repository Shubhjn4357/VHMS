import { NextRequest, NextResponse } from "next/server";

import {
  guardDuplicateMutation,
  guardMutationRoute,
  guardReadRoute,
} from "@/lib/api/request-guard";
import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import {
  createDoctor,
  listDoctorLookup,
  listDoctorManagement,
} from "@/lib/doctors/service";
import {
  createDoctorSchema,
  doctorManagementFiltersSchema,
} from "@/lib/validators/doctors";

export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get("scope");
  const guard = await requireApiPermissions(
    scope === "management" ? ["doctors.view"] : ["appointments.view"],
  );

  if (guard.response) {
    return guard.response;
  }

  const limitedResponse = guardReadRoute(request, "doctors", guard.session?.user.id);
  if (limitedResponse) {
    return limitedResponse;
  }

  try {
    if (scope === "management") {
      const filters = doctorManagementFiltersSchema.parse({
        q: request.nextUrl.searchParams.get("q") ?? undefined,
        status: request.nextUrl.searchParams.get("status") ?? undefined,
      });
      const payload = await listDoctorManagement(filters);
      return NextResponse.json(payload);
    }

    const q = request.nextUrl.searchParams.get("q") ?? undefined;
    const payload = await listDoctorLookup(q);

    return NextResponse.json(payload);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireApiPermissions(["doctors.manage"]);

  if (guard.response) {
    return guard.response;
  }

  const limitedResponse = guardMutationRoute(request, "doctors", guard.session?.user.id);
  if (limitedResponse) {
    return limitedResponse;
  }
  const duplicateResponse = guardDuplicateMutation(
    request,
    "doctors",
    guard.session?.user.id,
  );
  if (duplicateResponse) {
    return duplicateResponse;
  }

  try {
    const payload = createDoctorSchema.parse(await request.json());
    const createdDoctor = await createDoctor(payload, guard.session?.user.id);

    return NextResponse.json(createdDoctor, { status: 201 });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
