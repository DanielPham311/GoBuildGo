import type { NextRequest } from "next/server";
import { scoreSetup } from "@/modules/style";
import { jsonError } from "@/shared/api/response";

type Ctx = { params: { id: string } };

// GET /api/v1/setups/[id]/score — style score analysis.
export async function GET(_req: NextRequest, { params }: Ctx) {
  const result = await scoreSetup(params.id);
  if (!result) return jsonError("NOT_FOUND", "Setup not found");

  return Response.json(result);
}
