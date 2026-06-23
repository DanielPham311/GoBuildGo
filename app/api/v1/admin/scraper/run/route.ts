import type { NextRequest } from "next/server";
import { getAllScrapers } from "@/scripts/scrapers";
import { cleanProduct } from "@/scripts/scrapers/clean";
import { findDuplicate } from "@/scripts/scrapers/dedup";
import { prisma } from "@/shared/db";
import { slugify } from "@/lib/utils";
import { jsonError } from "@/shared/api/response";
import { toErrorResponse } from "@/shared/api/handle";
import { requireAdmin } from "@/shared/auth/helpers";
import { NextResponse } from "next/server";

async function upsertPriceWithHistory(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  componentId: string,
  cleaned: ReturnType<typeof cleanProduct>,
): Promise<boolean> {
  const existing = await tx.price.findUnique({
    where: {
      componentId_shop_condition: {
        componentId,
        shop: cleaned.shop as never,
        condition: "new",
      },
    },
    select: { id: true, price: true },
  });

  if (existing && Number(existing.price) !== cleaned.price) {
    await tx.priceHistory.create({
      data: {
        priceId: existing.id,
        oldPrice: existing.price,
        newPrice: cleaned.price,
      },
    });
  }

  await tx.price.upsert({
    where: {
      componentId_shop_condition: {
        componentId,
        shop: cleaned.shop as never,
        condition: "new",
      },
    },
    create: {
      componentId,
      shop: cleaned.shop as never,
      price: cleaned.price,
      originalPrice: cleaned.originalPrice,
      currency: "VND",
      url: cleaned.url,
      shopName: cleaned.shopName,
      isAvailable: cleaned.isAvailable,
    },
    update: {
      price: cleaned.price,
      originalPrice: cleaned.originalPrice,
      url: cleaned.url,
      shopName: cleaned.shopName,
      isAvailable: cleaned.isAvailable,
    },
  });

  return !!existing;
}

// POST /api/v1/admin/scraper/run — trigger a scrape run (API_DESIGN.md §10).
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (err) {
    return toErrorResponse(err);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const { queries } = body as { queries?: string[] };
  const searchQueries = queries ?? ["gaming desk", "gaming chair", "mechanical keyboard", "mouse", "monitor"];

  const startedAt = Date.now();
  const scrapers = getAllScrapers();
  let totalUpserted = 0;
  let totalSkipped = 0;
  let totalPriceChanges = 0;
  let totalErrors = 0;

  for (const scraper of scrapers) {
    let scraperUpserted = 0;
    let scraperSkipped = 0;
    let scraperErrors = 0;
    const scraperStartedAt = Date.now();

    for (const query of searchQueries) {
      try {
        const rawItems = await scraper.search(query, 10);
        for (const raw of rawItems) {
          try {
            const cleaned = cleanProduct(scraper.normalize(raw));
            if (!cleaned.name || cleaned.price <= 0) continue;

            const existingId = await findDuplicate(cleaned);

            if (existingId) {
              await prisma.$transaction(async (tx) => {
                const priceChanged = await upsertPriceWithHistory(tx, existingId, cleaned);
                if (priceChanged) totalPriceChanges++;
                await tx.component.update({
                  where: { id: existingId },
                  data: { embeddingStale: true },
                });
              });
              totalSkipped++;
              scraperSkipped++;
              continue;
            }

            const slug = slugify(`${cleaned.brand}-${cleaned.name}`).slice(0, 80);
            await prisma.$transaction(async (tx) => {
              const comp = await tx.component.upsert({
                where: { slug },
                create: {
                  slug,
                  name: cleaned.name,
                  brand: cleaned.brand,
                  category: cleaned.category as never,
                  description: cleaned.description,
                  specs: cleaned.specs as never,
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
                  imageUrl: cleaned.imageUrl,
                  isActive: true,
                  embeddingStale: true,
                },
              });

              await upsertPriceWithHistory(tx, comp.id, cleaned);
            });

            totalUpserted++;
            scraperUpserted++;
          } catch {
            totalErrors++;
            scraperErrors++;
          }
        }
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        totalErrors++;
        scraperErrors++;
      }
    }

    // Write health record per scraper
    await prisma.scraperHealth.create({
      data: {
        scraperName: scraper.name,
        status: scraperErrors === 0 ? "ok" : "error",
        durationMs: Date.now() - scraperStartedAt,
        upserted: scraperUpserted,
        skipped: scraperSkipped,
        errors: scraperErrors,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    upserted: totalUpserted,
    skipped: totalSkipped,
    priceChanges: totalPriceChanges,
    errors: totalErrors,
    durationMs: Date.now() - startedAt,
  });
}
