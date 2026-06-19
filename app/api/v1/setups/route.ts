import type { NextRequest } from "next/server";
import { listPublicSetups, toPublicSetup } from "@/modules/setups";
import { paginated, notImplemented } from "@/shared/api/response";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants";

// GET /api/v1/setups — list public setups (API_DESIGN.md §5).
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Number(sp.get("limit")) || DEFAULT_PAGE_SIZE);
  const { items, total } = await listPublicSetups(page, limit);
  return paginated(items.map(toPublicSetup), total, page, limit);
}

// POST /api/v1/setups — create a setup (API_DESIGN.md §5).
export async function POST() {
  return notImplemented("POST /api/v1/setups");
}
