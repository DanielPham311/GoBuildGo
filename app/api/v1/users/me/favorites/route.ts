import { type NextRequest } from "next/server";
import { listFavorites, toFavoriteComponent } from "@/modules/users";
import { requireUser } from "@/shared/auth/helpers";
import { paginated } from "@/shared/api/response";
import { toErrorResponse } from "@/shared/api/handle";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants";

// GET /api/v1/users/me/favorites — current user's favorited components (API_DESIGN.md §8).
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Number(sp.get("limit")) || DEFAULT_PAGE_SIZE);
    const { rows, total } = await listFavorites(user.id!, page, limit);
    return paginated(rows.map(toFavoriteComponent), total, page, limit);
  } catch (err) {
    return toErrorResponse(err);
  }
}
