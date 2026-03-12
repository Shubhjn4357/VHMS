import { NextRequest, NextResponse } from "next/server";

import { requireApiPermissions } from "@/lib/auth/api-guard";
import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { updateBlogPostSchema } from "@/lib/validators/blog";
import { deleteBlogPost, updateBlogPost } from "@/lib/blog/service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const guard = await requireApiPermissions(["blog.manage"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const { id } = await context.params;
    const payload = updateBlogPostSchema.parse(await request.json());
    const updatedPost = await updateBlogPost(
      { id, ...payload },
      guard.session?.user.id,
    );

    return NextResponse.json(updatedPost);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  const guard = await requireApiPermissions(["blog.manage"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const { id } = await context.params;
    await deleteBlogPost(id, guard.session?.user.id);

    return NextResponse.json({ id, success: true });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
