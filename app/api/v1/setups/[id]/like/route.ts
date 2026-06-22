import { NextResponse, type NextRequest } from "next/server";
import { toggleLike } from "@/modules/setups";
import { requireUser } from "@/shared/auth/helpers";
import { toErrorResponse } from "@/shared/api/handle";

type Ctx = { params: { id: string } };

// POST /api/v1/setups/[id]/like — toggle like on a setup (API_DESIGN.md §5).
export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireUser();
    const result = await toggleLike(params.id, user.id!);
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
