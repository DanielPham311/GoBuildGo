import { NextResponse, type NextRequest } from "next/server";
import { cloneSetup, cloneSetupSchema, toSetupDetail } from "@/modules/setups";
import { requireUser } from "@/shared/auth/helpers";
import { writeAuditLog } from "@/shared/audit-log/service";
import { toErrorResponse } from "@/shared/api/handle";

type Ctx = { params: { id: string } };

// POST /api/v1/setups/[id]/clone — clone a setup (API_DESIGN.md §5).
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireUser();
    let name: string | undefined;
    try {
      const body = await req.json();
      name = cloneSetupSchema.parse(body).name;
    } catch {
      // Body is optional for clone; ignore parse/JSON errors and use defaults.
    }
    const setup = await cloneSetup(params.id, user.id!, name);
    await writeAuditLog({
      actorId: user.id!,
      action: "setup.clone",
      targetId: setup.id,
      metadata: { sourceId: params.id },
    });
    return NextResponse.json(toSetupDetail(setup), { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
