import { notImplemented } from "@/shared/api/response";

// GET /api/v1/users/me/email-settings — notification preferences (API_DESIGN.md §8).
export async function GET() {
  return notImplemented("GET /api/v1/users/me/email-settings");
}

// PATCH /api/v1/users/me/email-settings — update notification preferences.
export async function PATCH() {
  return notImplemented("PATCH /api/v1/users/me/email-settings");
}
