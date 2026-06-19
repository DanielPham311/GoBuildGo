import type { NextRequest } from "next/server";
import { listComponentsQuerySchema, listComponents, toPublicComponent } from "@/modules/components";
import { paginated, jsonError } from "@/shared/api/response";

// GET /api/v1/components — list with filter, search, pagination (API_DESIGN.md §4).
export async function GET(req: NextRequest) {
  const parsed = listComponentsQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      "Invalid query parameters",
      parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    );
  }

  const { items, total } = await listComponents(parsed.data);
  return paginated(items.map(toPublicComponent), total, parsed.data.page, parsed.data.limit);
}
