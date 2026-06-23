import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  listAdminComponentsQuerySchema,
  createComponentSchema,
  listAdminComponents,
  createComponent,
  toAdminComponent,
} from "@/modules/admin";
import { requireAdmin } from "@/shared/auth/helpers";
import { paginated, jsonError } from "@/shared/api/response";
import { toErrorResponse } from "@/shared/api/handle";

// GET /api/v1/admin/components — admin list, includes inactive (API_DESIGN.md §10).
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const parsed = listAdminComponentsQuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams),
    );
    if (!parsed.success) {
      return jsonError(
        "VALIDATION_ERROR",
        "Invalid query parameters",
        parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      );
    }

    const { items, total } = await listAdminComponents(parsed.data);
    return paginated(items.map(toAdminComponent), total, parsed.data.page, parsed.data.limit);
  } catch (err) {
    return toErrorResponse(err);
  }
}

// POST /api/v1/admin/components — create component.
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const input = createComponentSchema.parse(body);
    const created = await createComponent(input);
    return NextResponse.json(toAdminComponent(created), { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
