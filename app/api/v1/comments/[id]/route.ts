import { NextResponse, type NextRequest } from "next/server";
import {
  updateComment,
  deleteComment,
} from "@/modules/comments";
import { updateCommentSchema } from "@/modules/comments/schema";
import { requireUser } from "@/shared/auth/helpers";
import { toErrorResponse } from "@/shared/api/handle";

type Ctx = { params: { id: string } };

// PATCH /api/v1/comments/[id]
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const input = updateCommentSchema.parse(body);

    const comment = await updateComment(user.id!, params.id, input);
    return NextResponse.json(comment);
  } catch (err) {
    return toErrorResponse(err);
  }
}

// DELETE /api/v1/comments/[id]
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireUser();
    await deleteComment(user.id!, params.id);
    return NextResponse.json({ message: "Comment deleted" });
  } catch (err) {
    return toErrorResponse(err);
  }
}