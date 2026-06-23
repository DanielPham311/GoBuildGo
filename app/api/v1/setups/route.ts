import { NextResponse, type NextRequest } from "next/server";
import {
  listPublicSetups,
  createSetup,
  createSetupSchema,
  listSetupsQuerySchema,
  toSetupDetail,
} from "@/modules/setups";
import { requireUser } from "@/shared/auth/helpers";
import { writeAuditLog } from "@/shared/audit-log/service";
import { paginated, jsonError } from "@/shared/api/response";
import { toErrorResponse } from "@/shared/api/handle";

// GET /api/v1/setups — list public setups (API_DESIGN.md §5).
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const parsed = listSetupsQuerySchema.safeParse({
    page: sp.get("page") ?? undefined,
    limit: sp.get("limit") ?? undefined,
    roomType: sp.get("roomType") ?? undefined,
    theme: sp.get("theme") ?? undefined,
    sort: sp.get("sort") ?? undefined,
  });
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }));
    return jsonError("VALIDATION_ERROR", "Invalid query parameters", details);
  }
  const { items, total } = await listPublicSetups(parsed.data);
  return paginated(items, total, parsed.data.page, parsed.data.limit);
}

// POST /api/v1/setups — create a setup (API_DESIGN.md §5).
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError("VALIDATION_ERROR", "Invalid JSON");
    }
    const input = createSetupSchema.parse(body);
    const setup = await createSetup(user.id!, input);
    await writeAuditLog({ actorId: user.id!, action: "setup.create", targetId: setup.id });
    return NextResponse.json(toSetupDetail(setup as any), { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
