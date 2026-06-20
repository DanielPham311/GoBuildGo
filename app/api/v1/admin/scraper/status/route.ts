import { prisma } from "@/shared/db";
import { NextResponse } from "next/server";

// GET /api/v1/admin/scraper/status — component + price counts (API_DESIGN.md §10).
export async function GET() {
  const [componentCount, priceCount, staleCount] = await Promise.all([
    prisma.component.count(),
    prisma.price.count(),
    prisma.component.count({ where: { embeddingStale: true } }),
  ]);

  return NextResponse.json({
    components: componentCount,
    prices: priceCount,
    embeddingsStale: staleCount,
  });
}
