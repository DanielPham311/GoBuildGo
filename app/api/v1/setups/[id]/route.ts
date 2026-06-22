import type { NextRequest } from "next/server";
import { getSetupById, updateSetup, deleteSetup, incrementView } from "@/modules/setups";
import { requireUser, AuthError } from "@/shared/auth/helpers";
import { updateSetupSchema } from "@/modules/setups/schema";
import { jsonError } from "@/shared/api/response";

type Ctx = { params: { id: string } };

// GET /api/v1/setups/[id] — setup detail (API_DESIGN.md §5).
export async function GET(_req: NextRequest, { params }: Ctx) {
  const setup = await getSetupById(params.id);
  if (!setup) return jsonError("NOT_FOUND", "Setup not found");

  // Increment view counter (fire-and-forget)
  incrementView(params.id).catch(() => {});

  return Response.json(setup);
}

// PATCH /api/v1/setups/[id] — update setup (owner only).
export async function PATCH(req: NextRequest, { params }: Ctx) {
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

  const parsed = updateSetupSchema.safeParse(body);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }));
    return jsonError("VALIDATION_ERROR", "Validation failed", details);
  }

  const updated = await updateSetup(params.id, user.id!, parsed.data);
  if (!updated) return jsonError("NOT_FOUND", "Setup not found or not owner");

  return Response.json(updated);
}

// DELETE /api/v1/setups/[id] — delete setup (owner only).
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return jsonError("UNAUTHENTICATED", "Authentication required");
  }

  const deleted = await deleteSetup(params.id, user.id!);
  if (!deleted) return jsonError("NOT_FOUND", "Setup not found or not owner");

  return new Response(null, { status: 204 });
}
