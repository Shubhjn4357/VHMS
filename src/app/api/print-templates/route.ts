import { NextRequest, NextResponse } from "next/server";

import type { PrintTemplateUpdateInput } from "@/types/printTemplates";
import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { ApiError } from "@/lib/api/errors";
import { requireApiPermissions } from "@/lib/auth/api-guard";
import {
  listPrintTemplateWorkspace,
  resetPrintTemplate,
  updatePrintTemplate,
} from "@/lib/print-templates/service";
import {
  printTemplateQuerySchema,
  updatePrintTemplateSchema,
} from "@/lib/validators/print-templates";

export async function GET() {
  const guard = await requireApiPermissions(["settings.view"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const workspace = await listPrintTemplateWorkspace();
    return NextResponse.json(workspace);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  const guard = await requireApiPermissions(["settings.manage"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const payload = updatePrintTemplateSchema.parse(
      await request.json(),
    ) as PrintTemplateUpdateInput;

    if (!guard.session?.user.id) {
      throw new ApiError(401, "Session user unavailable.");
    }

    const updated = await updatePrintTemplate(payload, guard.session.user.id);

    return NextResponse.json(updated);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  const guard = await requireApiPermissions(["settings.manage"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const payload = printTemplateQuerySchema.parse({
      templateKey: request.nextUrl.searchParams.get("templateKey") ?? undefined,
    }) as { templateKey?: PrintTemplateUpdateInput["templateKey"] };

    if (!guard.session?.user.id) {
      throw new ApiError(401, "Session user unavailable.");
    }

    if (!payload.templateKey) {
      throw new ApiError(400, "templateKey is required.");
    }

    const template = await resetPrintTemplate(
      payload.templateKey,
      guard.session.user.id,
    );

    return NextResponse.json(template);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
