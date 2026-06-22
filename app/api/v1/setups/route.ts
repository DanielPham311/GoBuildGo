import type { NextRequest } from "next/server";
import { createSetup, listPublicSetups } from "@/modules/setups";
import { requireUser } from "@/shared/auth/helpers";
import { createSetupSchema, listSetupsQuerySchema } from "@/modules/setups/schema";
import { paginated, jsonError } from "@/shared/api/response";

// GET /api/v1/setups — list public setups (API_DESIGN.md §5).
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const parsed = listSetupsQuerySchema.safeParse({
    page: sp.get("page"),
    limit: sp.get("limit"),
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
  let user;
  try {
    user = await requireUser();
  } catch {
    return jsonError("UNAUTHENTICATED", "Authentication required");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const parsed = createSetupSchema.safeParse(body);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }));
    return jsonError("VALIDATION_ERROR", "Validation failed", details);
  }

  const setup = await createSetup(user.id!, parsed.data);
  return Response.json(setup, { status: 201 });
}
