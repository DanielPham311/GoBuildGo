import type { NextRequest } from "next/server";
import { getAllScrapers } from "@/scripts/scrapers";
import { cleanProduct } from "@/scripts/scrapers/clean";
import { prisma } from "@/shared/db";
import { slugify } from "@/lib/utils";
import { jsonError } from "@/shared/api/response";
import { NextResponse } from "next/server";

// POST /api/v1/admin/scraper/run — trigger a scrape run (API_DESIGN.md §10).
export async function POST(req: NextRequest) {
  // TODO: add admin auth check (requireAdmin).

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const { queries } = body as { queries?: string[] };
  const searchQueries = queries ?? ["gaming desk", "gaming chair", "mechanical keyboard", "mouse", "monitor"];

  const scrapers = getAllScrapers();
  let totalUpserted = 0;
  const errors: string[] = [];

  for (const scraper of scrapers) {
    for (const query of searchQueries) {
      try {
        const rawItems = await scraper.search(query, 10);
        for (const raw of rawItems) {
          try {
            const cleaned = cleanProduct(scraper.normalize(raw));
            if (!cleaned.name || cleaned.price <= 0) continue;

            const slug = slugify(`${cleaned.brand}-${cleaned.name}`).slice(0, 80);
            await prisma.component.upsert({
              where: { slug },
              create: {
                slug,
                name: cleaned.name,
                brand: cleaned.brand,
                category: cleaned.category as never,
                description: cleaned.description,
                specs: cleaned.specs,
                colors: cleaned.colors,
                styleTags: cleaned.styleTags,
                imageUrl: cleaned.imageUrl,
                isActive: true,
                embeddingStale: true,
              },
              update: {
                name: cleaned.name,
                brand: cleaned.brand,
                description: cleaned.description,
                specs: cleaned.specs,
                colors: cleaned.colors,
                styleTags: cleaned.styleTags,
                imageUrl: cleaned.imageUrl,
                isActive: true,
                embeddingStale: true,
              },
            });
            totalUpserted++;
          } catch {
            // skip individual item errors
          }
        }
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        errors.push(`[${scraper.name}] ${query}: ${err}`);
      }
    }
  }

  return NextResponse.json({ ok: true, upserted: totalUpserted, errors });
}
