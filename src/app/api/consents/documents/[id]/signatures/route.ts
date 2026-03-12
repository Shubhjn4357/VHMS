import { NextRequest, NextResponse } from "next/server";

import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import { signConsentDocument } from "@/lib/consents/service";
import { createConsentSignatureSchema } from "@/lib/validators/consent";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const guard = await requireApiPermissions(["consents.finalize"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const { id } = await context.params;
    const payload = createConsentSignatureSchema.parse(await request.json());
    const updatedDocument = await signConsentDocument(
      {
        consentDocumentId: id,
        ...payload,
      },
      guard.session?.user.id,
    );

    return NextResponse.json(updatedDocument, { status: 201 });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
