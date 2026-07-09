import { NextResponse, type NextRequest } from "next/server";
import {
  listComments,
  createComment,
} from "@/modules/comments";
import { listCommentsSchema, createCommentSchema } from "@/modules/comments/schema";
import { requireUser } from "@/shared/auth/helpers";
import { toErrorResponse } from "@/shared/api/handle";

// GET /api/v1/comments?setupId=...&cursor=...&limit=...
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const input = listCommentsSchema.parse({
      setupId: url.searchParams.get("setupId") || "",
      cursor: url.searchParams.get("cursor") || undefined,
      limit: url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : undefined,
    });

    const result = await listComments(input);
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}

// POST /api/v1/comments
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const input = createCommentSchema.parse(body);

    const comment = await createComment(user.id!, input);
    return NextResponse.json(comment, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}