import { NextResponse, type NextRequest } from "next/server";
import {
  getProfile,
  updateProfile,
  updateProfileSchema,
  toPublicProfile,
} from "@/modules/users";
import { requireUser } from "@/shared/auth/helpers";
import { jsonError } from "@/shared/api/response";
import { toErrorResponse } from "@/shared/api/handle";

// GET /api/v1/users/me — current user profile (API_DESIGN.md §8).
export async function GET() {
  try {
    const user = await requireUser();
    const profile = await getProfile(user.id!);
    return NextResponse.json(toPublicProfile(profile));
  } catch (err) {
    return toErrorResponse(err);
  }
}

// PATCH /api/v1/users/me — update profile.
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError("VALIDATION_ERROR", "Invalid JSON");
    }
    const input = updateProfileSchema.parse(body);
    const profile = await updateProfile(user.id!, input);
    return NextResponse.json(toPublicProfile(profile));
  } catch (err) {
    return toErrorResponse(err);
  }
}
