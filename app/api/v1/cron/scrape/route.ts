import { NextResponse, type NextRequest } from "next/server";
import { jsonError } from "@/shared/api/response";

// GET /api/v1/cron/scrape?secret=CRON_SECRET
// Triggered by Vercel cron every 6 hours.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return jsonError("UNAUTHENTICATED", "Invalid cron secret");
  }

  // Dynamically import to avoid loading at module init (heavy deps)
  const scrapeModule = await import("@/scripts/scrape");
  const main = scrapeModule.main;

  // Fire and forget — don't block the cron response
  void main().catch((err: unknown) => {
    console.error("[cron/scrape] Failed:", err);
  });

  return NextResponse.json({ status: "started", message: "Scrape job started in background" });
}
