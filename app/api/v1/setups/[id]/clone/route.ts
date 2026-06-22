import type { NextRequest } from "next/server";
import { cloneSetup } from "@/modules/setups";
import { requireUser } from "@/shared/auth/helpers";
import { cloneSetupSchema } from "@/modules/setups/schema";
import { jsonError } from "@/shared/api/response";

type Ctx = { params: { id: string } };

// POST /api/v1/setups/[id]/clone — clone a setup to current user's account.
export async function POST(req: NextRequest, { params }: Ctx) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return jsonError("UNAUTHENTICATED", "Authentication required");
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const parsed = cloneSetupSchema.safeParse(body);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }));
    return jsonError("VALIDATION_ERROR", "Validation failed", details);
  }

  const cloned = await cloneSetup(params.id, user.id!, parsed.data.name);
  if (!cloned) return jsonError("NOT_FOUND", "Setup not found or not accessible");

  return Response.json(cloned, { status: 201 });
}
