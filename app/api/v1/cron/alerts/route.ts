import { NextResponse, type NextRequest } from "next/server";
import { jsonError } from "@/shared/api/response";
import { checkPriceAlerts } from "@/modules/alerts";

// GET /api/v1/cron/alerts?secret=CRON_SECRET
// Triggered by Vercel cron daily at 9 AM Vietnam time.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return jsonError("UNAUTHENTICATED", "Invalid cron secret");
  }

  // Fire and forget — don't block the cron response
  checkPriceAlerts({ sinceHours: 24, limit: 50 }).catch((err: unknown) => {
    console.error("[cron/alerts] Failed:", err);
  });

  return NextResponse.json({
    status: "started",
    message: "Price alert check started in background",
  });
}