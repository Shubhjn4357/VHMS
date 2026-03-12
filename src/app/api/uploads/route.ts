import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { guardMutationRoute } from "@/lib/api/request-guard";
import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { hasSomePermission } from "@/lib/permissions/ability";
import { getUploadRule, storeUploadedFile } from "@/lib/uploads/service";
import { uploadRequestSchema } from "@/lib/validators/uploads";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const limitedResponse = guardMutationRoute(request, "uploads", session.user.id);
  if (limitedResponse) {
    return limitedResponse;
  }

  try {
    const formData = await request.formData();
    const parsed = uploadRequestSchema.parse({
      target: formData.get("target"),
    });
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File)) {
      return NextResponse.json(
        { message: "Select a file to upload." },
        { status: 400 },
      );
    }

    const requiredPermissions = getUploadRule(parsed.target).permissions;
    const permissions = session.user.permissions ?? [];

    if (!hasSomePermission(permissions, requiredPermissions)) {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const asset = await storeUploadedFile({
      file: fileEntry,
      target: parsed.target,
      actorUserId: session.user.id,
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
