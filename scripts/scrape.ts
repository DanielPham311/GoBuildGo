/**
 * Standalone scrape entry point — runs the Firecrawl multi-shop crawler.
 *
 * Usage:
 *   npx tsx scripts/scrape.ts          # run with defaults
 *   npx tsx scripts/scrape.ts "gaming desk"  # run with custom query
 *
 * Reuses the existing pipeline from scraper-run.ts:
 *   cleanProduct → findDuplicate → upsertProduct → ScraperHealth
 */

import { PrismaClient } from "@prisma/client";
import { firecrawlCrawler } from "./scrapers/firecrawl";
import { SEARCH_QUERIES } from "./scrapers/queries";
import { cleanProduct } from "./scrapers/clean";
import { findDuplicate } from "./scrapers/dedup";
import { slugify } from "@/lib/utils";
import { embedText } from "@/shared/ai";
import { getCreditsUsed, resetCredits } from "./scrapers/credits";

const VALID_CATEGORIES = ["desk", "chair", "monitor", "keyboard", "mouse", "lighting", "decor", "audio", "accessory"] as const;
const VALID_SHOPS = ["shopee", "lazada", "tiki", "phongvu", "gearvn", "nhaxinh"] as const;

function toCategory(s: string): typeof VALID_CATEGORIES[number] {
  return VALID_CATEGORIES.includes(s as typeof VALID_CATEGORIES[number]) ? s as typeof VALID_CATEGORIES[number] : "accessory";
}
function toShop(s: string): typeof VALID_SHOPS[number] {
  return VALID_SHOPS.includes(s as typeof VALID_SHOPS[number]) ? s as typeof VALID_SHOPS[number] : "shopee";
}

const prisma = new PrismaClient();

async function upsertProduct(product: ReturnType<typeof cleanProduct>): Promise<{ new: boolean; priceChanged: boolean }> {
  const slug = slugify(`${product.brand}-${product.name}`).slice(0, 80);

  const existingPrice = await prisma.price.findUnique({
    where: {
      componentId_shop_condition: {
        componentId: "",
        shop: toShop(product.shop),
        condition: "new",
      },
    },
  });

  const component = await prisma.component.upsert({
    where: { slug },
    create: {
      slug,
      name: product.name,
      brand: product.brand,
      category: toCategory(product.category),
      description: product.description,
      specs: product.specs,
      colors: product.colors,
      styleTags: product.styleTags,
      imageUrl: product.imageUrl,
      isActive: true,
      embeddingStale: true,
    },
    update: {
      name: product.name,
      brand: product.brand,
      description: product.description,
      specs: product.specs,
      colors: product.colors,
      styleTags: product.styleTags,
      imageUrl: product.imageUrl,
      isActive: true,
      embeddingStale: true,
    },
  });

  let priceChanged = false;
  if (product.price > 0) {
    priceChanged = await prisma.$transaction(async (tx) => {
      const existing = await tx.price.findUnique({
        where: {
          componentId_shop_condition: {
            componentId: component.id,
            shop: toShop(product.shop),
            condition: "new",
          },
        },
        select: { id: true, price: true },
      });

      if (existing && Number(existing.price) !== product.price) {
        await tx.priceHistory.create({
          data: {
            priceId: existing.id,
            oldPrice: existing.price,
            newPrice: product.price,
          },
        });
      }

      await tx.price.upsert({
        where: {
          componentId_shop_condition: {
            componentId: component.id,
            shop: toShop(product.shop),
            condition: "new",
          },
        },
        create: {
          componentId: component.id,
          shop: toShop(product.shop),
          price: product.price,
          originalPrice: product.originalPrice,
          currency: "VND",
          url: product.url,
          shopName: product.shopName,
          isAvailable: product.isAvailable,
        },
        update: {
          price: product.price,
          originalPrice: product.originalPrice,
          url: product.url,
          shopName: product.shopName,
          isAvailable: product.isAvailable,
        },
      });

      return !!existing;
    });
  }

  // Invalidate embedding for new/updated component
  if (!existingPrice || priceChanged) {
    const text = [product.name, product.brand, `category=${product.category}`, product.description ?? "", `colors: ${product.colors.join(", ")}`, `style: ${product.styleTags.join(", ")}`].filter(Boolean).join(". ").trim();
    const vec = await embedText(text);
    await prisma.$executeRawUnsafe(
      `UPDATE components SET embedding = $1::vector WHERE id = $2`,
      `[${vec.join(",")}]`,
      component.id,
    );
  }

  return { new: !existingPrice, priceChanged };
}

async function upsertPriceWithHistory(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  componentId: string,
  cleaned: ReturnType<typeof cleanProduct>,
): Promise<boolean> {
  const existing = await tx.price.findUnique({
    where: {
      componentId_shop_condition: {
        componentId,
        shop: toShop(cleaned.shop),
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
        shop: toShop(cleaned.shop),
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

export async function main() {
  const customQuery = process.argv[2];
  const queries = customQuery
    ? [{ query: customQuery, category: "accessory" as const, limit: 10 }]
    : SEARCH_QUERIES;

  console.log(`🧹 Firecrawl Scraper — ${queries.length} queries`);
  console.log(`═══════════════════════════════════════════`);

  const startedAt = Date.now();
  let totalUpserted = 0;
  let totalSkipped = 0;
  let totalPriceChanges = 0;
  let totalErrors = 0;

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    console.log(`\n[${i + 1}/${queries.length}] Category: ${q.category}`);
    console.log(`  Query: "${q.query}"`);

    try {
      const rawItems = await firecrawlCrawler.search(q.query, q.limit);
      console.log(`  Raw items: ${rawItems.length}`);

      for (const raw of rawItems) {
        try {
          const normalized = firecrawlCrawler.normalize(raw);
          const cleaned = cleanProduct(normalized);
          if (!cleaned.name || cleaned.price <= 0) {
            console.log(`    ⚠ Skipped (no price/name): "${cleaned.name}"`);
            totalSkipped++;
            continue;
          }

          const existingId = await findDuplicate(cleaned);

          if (existingId) {
            let priceChanged = false;
            if (cleaned.price > 0) {
              priceChanged = await prisma.$transaction(async (tx) => {
                return upsertPriceWithHistory(tx, existingId, cleaned);
              });
            }
            await prisma.component.update({
              where: { id: existingId },
              data: { embeddingStale: true },
            });
            totalSkipped++;
            if (priceChanged) totalPriceChanges++;
            continue;
          }

          const { priceChanged } = await upsertProduct(cleaned);
          totalUpserted++;
          if (priceChanged) totalPriceChanges++;
        } catch (err) {
          console.error(`    ❌ Error processing item: ${err}`);
          totalErrors++;
        }
      }

      // Rate limit between query iterations
      if (i < queries.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (err) {
      console.error(`  ❌ Query failed: ${err}`);
      totalErrors++;
    }
  }

  const duration = Date.now() - startedAt;

  // Track credits used
  const credits = getCreditsUsed();
  resetCredits();

  // Write health record
  await prisma.scraperHealth.create({
    data: {
      scraperName: "firecrawl",
      status: totalErrors === 0 ? "ok" : "error",
      durationMs: duration,
      upserted: totalUpserted,
      skipped: totalSkipped,
      errors: totalErrors,
      creditsUsed: credits.total,
    },
  });

  console.log(`\n═══════════════════════════════════════════`);
  console.log(`✅ Done in ${Math.round(duration / 1000)}s`);
  console.log(`   ${totalUpserted} new products`);
  console.log(`   ${totalSkipped} duplicates`);
  console.log(`   ${totalPriceChanges} price changes`);
  console.log(`   ${totalErrors} errors`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
