import { NextRequest, NextResponse } from "next/server";

import { requireApiPermissions } from "@/lib/auth/api-guard";
import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { blogFiltersSchema, createBlogPostSchema } from "@/lib/validators/blog";
import { createBlogPost, listAdminBlogPosts } from "@/lib/blog/service";

export async function GET(request: NextRequest) {
  const guard = await requireApiPermissions(["blog.view"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const filters = blogFiltersSchema.parse({
      q: request.nextUrl.searchParams.get("q") ?? undefined,
      status: request.nextUrl.searchParams.get("status") ?? undefined,
    });

    const payload = await listAdminBlogPosts(filters);
    return NextResponse.json(payload);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireApiPermissions(["blog.manage"]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const payload = createBlogPostSchema.parse(await request.json());
    const createdPost = await createBlogPost(payload, guard.session?.user.id);

    return NextResponse.json(createdPost, { status: 201 });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
