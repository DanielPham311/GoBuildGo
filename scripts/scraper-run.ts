import { PrismaClient } from "@prisma/client";
import { getAllScrapers } from "./scrapers";
import { cleanProduct } from "./scrapers/clean";
import { findDuplicate } from "./scrapers/dedup";
import { slugify } from "@/lib/utils";

const prisma = new PrismaClient();

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

async function upsertProduct(product: ReturnType<typeof cleanProduct>): Promise<{ new: boolean; priceChanged: boolean }> {
  // Check for existing price in this shop
  const existingPrice = await prisma.price.findUnique({
    where: {
      componentId_shop_condition: {
        componentId: "", // will be filled below
        shop: product.shop as never,
        condition: "new",
      },
    },
  });

  const slug = slugify(`${product.brand}-${product.name}`).slice(0, 80);

  const component = await prisma.component.upsert({
    where: { slug },
    create: {
      slug,
      name: product.name,
      brand: product.brand,
      category: product.category as never,
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
      return upsertPriceWithHistory(tx, component.id, product);
    });
  }

  return { new: !existingPrice, priceChanged };
}

async function main() {
  const queries = (process.argv[2] ?? "gaming desk,gaming chair,mechanical keyboard,mouse,monitor,desk lamp")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const scrapers = getAllScrapers();
  console.log(`Running ${scrapers.length} scraper(s) for ${queries.length} queries…`);

  const startedAt = Date.now();
  let totalUpserted = 0;
  let totalSkipped = 0;
  let totalPriceChanges = 0;
  let totalErrors = 0;

  for (const scraper of scrapers) {
    let scraperUpserted = 0;
    let scraperSkipped = 0;
    let scraperErrors = 0;
    const scraperStartedAt = Date.now();

    for (const query of queries) {
      try {
        console.log(`  [${scraper.name}] Searching: "${query}"`);
        const rawItems = await scraper.search(query, 10);
        console.log(`    Found ${rawItems.length} items`);

        for (const raw of rawItems) {
          try {
            const normalized = scraper.normalize(raw);
            const cleaned = cleanProduct(normalized);
            if (!cleaned.name || cleaned.price <= 0) continue;

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
              scraperSkipped++;
              if (priceChanged) totalPriceChanges++;
              continue;
            }

            const { priceChanged } = await upsertProduct(cleaned);
            totalUpserted++;
            scraperUpserted++;
            if (priceChanged) totalPriceChanges++;
          } catch {
            totalErrors++;
            scraperErrors++;
          }
        }

        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        console.error(`  [${scraper.name}] Search failed for "${query}": ${err}`);
        totalErrors++;
        scraperErrors++;
      }
    }

    // Write health record
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

  console.log(`\nDone in ${Date.now() - startedAt}ms. ${totalUpserted} new, ${totalSkipped} deduped, ${totalPriceChanges} price changes, ${totalErrors} errors.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
