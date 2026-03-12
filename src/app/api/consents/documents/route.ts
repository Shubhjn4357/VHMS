import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { createConsentDocument } from "@/lib/consents/service";
import { createConsentDocumentSchema } from "@/lib/validators/consent";

export async function POST(request: NextRequest) {
  const guard = await requireApiPermissions(["consents.create"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const payload = createConsentDocumentSchema.parse(await request.json());
    const createdDocument = await createConsentDocument(
      payload,
      guard.session?.user.id,
    );

    return NextResponse.json(createdDocument, { status: 201 });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
