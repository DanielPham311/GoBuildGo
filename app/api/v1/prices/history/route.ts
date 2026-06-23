import { NextResponse, type NextRequest } from "next/server";
import { getComponentPriceHistory, toPriceHistory } from "@/modules/prices";
import { jsonError } from "@/shared/api/response";
import { toErrorResponse } from "@/shared/api/handle";

// GET /api/v1/prices/history — per-shop price history for a component (F13).
export async function GET(req: NextRequest) {
  try {
    const componentId = req.nextUrl.searchParams.get("component_id");
    if (!componentId) {
      return jsonError("VALIDATION_ERROR", 'Query parameter "component_id" is required');
    }
    const series = await getComponentPriceHistory(componentId);
    return NextResponse.json(toPriceHistory(componentId, series));
  } catch (err) {
    return toErrorResponse(err);
  }
}
