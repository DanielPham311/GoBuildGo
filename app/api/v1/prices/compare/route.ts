import { NextResponse, type NextRequest } from "next/server";
import { getComponentPrices, toPriceComparison } from "@/modules/prices";
import { jsonError } from "@/shared/api/response";
import { toErrorResponse } from "@/shared/api/handle";

// GET /api/v1/prices/compare — compare prices across shops (API_DESIGN.md §7).
export async function GET(req: NextRequest) {
  try {
    const componentId = req.nextUrl.searchParams.get("component_id");
    if (!componentId) {
      return jsonError("VALIDATION_ERROR", 'Query parameter "component_id" is required');
    }
    const component = await getComponentPrices(componentId);
    return NextResponse.json(toPriceComparison(component));
  } catch (err) {
    return toErrorResponse(err);
  }
}
