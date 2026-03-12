import { NextRequest, NextResponse } from "next/server";

import {
  guardDuplicateMutation,
  guardMutationRoute,
  guardReadRoute,
} from "@/lib/api/request-guard";
import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { createPatient, listPatients } from "@/lib/patients/service";
import {
  createPatientSchema,
  patientFiltersSchema,
} from "@/lib/validators/patients";

export async function GET(request: NextRequest) {
  const guard = await requireApiPermissions(["patients.view"]);

  if (guard.response) {
    return guard.response;
  }

  const limitedResponse = guardReadRoute(request, "patients", guard.session?.user.id);
  if (limitedResponse) {
    return limitedResponse;
  }

  try {
    const filters = patientFiltersSchema.parse({
      q: request.nextUrl.searchParams.get("q") ?? undefined,
    });

    const payload = await listPatients(filters);
    return NextResponse.json(payload);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireApiPermissions(["patients.create"]);

  if (guard.response) {
    return guard.response;
  }

  const limitedResponse = guardMutationRoute(
    request,
    "patients",
    guard.session?.user.id,
  );
  if (limitedResponse) {
    return limitedResponse;
  }
  const duplicateResponse = guardDuplicateMutation(
    request,
    "patients",
    guard.session?.user.id,
  );
  if (duplicateResponse) {
    return duplicateResponse;
  }

  try {
    const payload = createPatientSchema.parse(await request.json());
    const createdPatient = await createPatient(payload, guard.session?.user.id);

    return NextResponse.json(createdPatient, { status: 201 });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
