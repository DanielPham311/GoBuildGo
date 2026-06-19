import { NextResponse } from "next/server";

// GET /api/v1/health — liveness check.
export async function GET() {
  return NextResponse.json({ status: "ok", version: "v1" });
}
