import { NextResponse, type NextRequest } from "next/server";
import {
  getSetup,
  isLikedBy,
  updateSetup,
  deleteSetup,
  updateSetupSchema,
  toSetupDetail,
} from "@/modules/setups";
import { getCurrentUser, requireUser } from "@/shared/auth/helpers";
import { writeAuditLog } from "@/shared/audit-log/service";
import { jsonError } from "@/shared/api/response";
import { toErrorResponse } from "@/shared/api/handle";

type Ctx = { params: { id: string } };

// GET /api/v1/setups/[id] — setup detail (API_DESIGN.md §5).
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    const setup = await getSetup(params.id, user?.id);
    const liked = await isLikedBy(setup.id, user?.id);
    return NextResponse.json(toSetupDetail(setup, liked));
  } catch (err) {
    return toErrorResponse(err);
  }
}

// PATCH /api/v1/setups/[id] — update setup (owner only).
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireUser();
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError("VALIDATION_ERROR", "Invalid JSON");
    }
    const input = updateSetupSchema.parse(body);
    const setup = await updateSetup(params.id, user.id!, input);
    await writeAuditLog({ actorId: user.id!, action: "setup.update", targetId: setup.id });
    return NextResponse.json(toSetupDetail(setup));
  } catch (err) {
    return toErrorResponse(err);
  }
}

// DELETE /api/v1/setups/[id] — delete setup (owner only).
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireUser();
    await deleteSetup(params.id, user.id!);
    await writeAuditLog({ actorId: user.id!, action: "setup.delete", targetId: params.id });
    return NextResponse.json({ message: "Setup deleted successfully", id: params.id });
  } catch (err) {
    return toErrorResponse(err);
  }
}
