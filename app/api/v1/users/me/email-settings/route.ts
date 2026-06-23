import { NextResponse, type NextRequest } from "next/server";
import {
  getEmailSettings,
  updateEmailSettings,
  updateEmailSettingsSchema,
} from "@/modules/users";
import { requireUser } from "@/shared/auth/helpers";
import { jsonError } from "@/shared/api/response";
import { toErrorResponse } from "@/shared/api/handle";

// GET /api/v1/users/me/email-settings — notification preferences (API_DESIGN.md §8).
export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(await getEmailSettings(user.id!));
  } catch (err) {
    return toErrorResponse(err);
  }
}

// PATCH /api/v1/users/me/email-settings — update notification preferences.
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError("VALIDATION_ERROR", "Invalid JSON");
    }
    const input = updateEmailSettingsSchema.parse(body);
    return NextResponse.json(await updateEmailSettings(user.id!, input));
  } catch (err) {
    return toErrorResponse(err);
  }
}
