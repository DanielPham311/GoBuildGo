import type { NextRequest } from "next/server";
import { listPromptLogsQuerySchema, listPromptLogs, toAdminPromptLog } from "@/modules/admin";
import { requireAdmin } from "@/shared/auth/helpers";
import { paginated, jsonError } from "@/shared/api/response";
import { toErrorResponse } from "@/shared/api/handle";

// GET /api/v1/admin/prompts — observability log of user search/visualize prompts.
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const parsed = listPromptLogsQuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams),
    );
    if (!parsed.success) {
      return jsonError(
        "VALIDATION_ERROR",
        "Invalid query parameters",
        parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      );
    }

    const { items, total } = await listPromptLogs(parsed.data);
    return paginated(items.map(toAdminPromptLog), total, parsed.data.page, parsed.data.limit);
  } catch (err) {
    return toErrorResponse(err);
  }
}
