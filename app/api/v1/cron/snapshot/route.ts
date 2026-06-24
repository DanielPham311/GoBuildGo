import { NextResponse, type NextRequest } from "next/server";
import { jsonError } from "@/shared/api/response";

// GET /api/v1/cron/snapshot?secret=CRON_SECRET
// Triggered by Vercel cron daily at 2 AM UTC (9 AM Vietnam).
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return jsonError("UNAUTHENTICATED", "Invalid cron secret");
  }

  try {
    const snapshotModule = await import("@/scripts/snapshot");
    await snapshotModule.main();
    return NextResponse.json({ status: "ok", message: "Price snapshot completed" });
  } catch (err: unknown) {
    console.error("[cron/snapshot] Failed:", err);
    return jsonError("INTERNAL_ERROR", "Snapshot failed");
  }
}
