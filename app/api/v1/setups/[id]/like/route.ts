import type { NextRequest } from "next/server";
import { toggleLike } from "@/modules/setups";
import { requireUser } from "@/shared/auth/helpers";
import { jsonError } from "@/shared/api/response";

type Ctx = { params: { id: string } };

// POST /api/v1/setups/[id]/like — toggle like on a setup.
export async function POST(_req: NextRequest, { params }: Ctx) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return jsonError("UNAUTHENTICATED", "Authentication required");
  }

  const result = await toggleLike(params.id, user.id!);
  return Response.json(result);
}
