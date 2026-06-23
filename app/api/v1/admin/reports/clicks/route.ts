import { NextResponse } from "next/server";
import { getAffiliateReport } from "@/modules/admin";
import { requireAdmin } from "@/shared/auth/helpers";
import { toErrorResponse } from "@/shared/api/handle";

// GET /api/v1/admin/reports/clicks — most-clicked components + per-shop breakdown (F24).
export async function GET() {
  try {
    await requireAdmin();
    const report = await getAffiliateReport();
    return NextResponse.json(report);
  } catch (err) {
    return toErrorResponse(err);
  }
}
