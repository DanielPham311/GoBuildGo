import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  updateComponentSchema,
  updateComponent,
  deleteComponent,
  toAdminComponent,
} from "@/modules/admin";
import { requireAdmin } from "@/shared/auth/helpers";
import { toErrorResponse } from "@/shared/api/handle";

// PATCH /api/v1/admin/components/[id] — update component (API_DESIGN.md §10).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const body = await req.json();
    const input = updateComponentSchema.parse(body);
    const updated = await updateComponent(params.id, input);
    return NextResponse.json(toAdminComponent(updated));
  } catch (err) {
    return toErrorResponse(err);
  }
}

// DELETE /api/v1/admin/components/[id] — delete component.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    await deleteComponent(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
