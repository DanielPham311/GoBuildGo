import { NextResponse, type NextRequest } from "next/server";
import { jsonError } from "@/shared/api/response";

// GET /api/v1/cron/scrape?secret=CRON_SECRET
// Triggered by Vercel cron daily at 3 AM UTC (10 AM Vietnam).
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return jsonError("UNAUTHENTICATED", "Invalid cron secret");
  }

  // Budget guard: check estimated credits used this month
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const result = await prisma.scraperHealth.aggregate({
      _sum: { creditsUsed: true },
      where: {
        scraperName: "firecrawl",
        ranAt: { gte: startOfMonth },
      },
    });
    const creditsUsedThisMonth = result._sum.creditsUsed ?? 0;
    const BUDGET_LIMIT = 900; // 900 of 1000 free tier (10% buffer)

    if (creditsUsedThisMonth >= BUDGET_LIMIT) {
      // Log skip
      await prisma.scraperHealth.create({
        data: {
          scraperName: "firecrawl",
          status: "skipped_budget",
          creditsUsed: 0,
        },
      });
      console.warn(`[cron/scrape] Skipped: budget exhausted (${creditsUsedThisMonth}/${BUDGET_LIMIT})`);
      return NextResponse.json({
        status: "skipped",
        reason: "credit_budget_exhausted",
        creditsUsed: creditsUsedThisMonth,
        budget: BUDGET_LIMIT,
      });
    }
  } catch (err) {
    console.error("[cron/scrape] Budget check failed:", err);
    // Continue anyway — don't block on check failure
  } finally {
    await prisma.$disconnect();
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
