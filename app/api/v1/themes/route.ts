import type { NextRequest } from "next/server";
import { listThemesQuerySchema, listThemes, toPublicTheme } from "@/modules/themes";
import { paginated, jsonError } from "@/shared/api/response";

// GET /api/v1/themes — list curated themes (API_DESIGN.md §6).
export async function GET(req: NextRequest) {
  const parsed = listThemesQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      "Invalid query parameters",
      parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    );
  }

  const { items, total } = await listThemes(parsed.data);
  return paginated(items.map(toPublicTheme), total, parsed.data.page, parsed.data.limit);
}
