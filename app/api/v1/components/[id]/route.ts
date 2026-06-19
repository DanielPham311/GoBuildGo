import { NextResponse } from "next/server";
import { getComponentById, toPublicComponent } from "@/modules/components";
import { jsonError } from "@/shared/api/response";

// GET /api/v1/components/[id] — component detail + prices (API_DESIGN.md §4).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const component = await getComponentById(params.id);
  if (!component) return jsonError("NOT_FOUND", "Component not found");
  return NextResponse.json(toPublicComponent(component));
}
