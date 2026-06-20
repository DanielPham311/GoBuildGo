import { PrismaClient } from "@prisma/client";
import { getAllScrapers } from "./scrapers";
import { cleanProduct } from "./scrapers/clean";
import { slugify } from "@/lib/utils";

const prisma = new PrismaClient();

async function upsertComponent(product: ReturnType<typeof cleanProduct>) {
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

  if (product.price > 0) {
    await prisma.price.upsert({
      where: {
        componentId_shop_condition: {
          componentId: component.id,
          shop: product.shop as never,
          condition: "new",
        },
      },
      create: {
        componentId: component.id,
        shop: product.shop as never,
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
  }

  return component;
}

async function main() {
  const queries = (process.argv[2] ?? "gaming desk,gaming chair,mechanical keyboard,mouse,monitor,desk lamp")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const scrapers = getAllScrapers();
  console.log(`Running ${scrapers.length} scraper(s) for ${queries.length} queries…`);

  let totalUpserted = 0;
  for (const scraper of scrapers) {
    for (const query of queries) {
      try {
        console.log(`  [${scraper.name}] Searching: "${query}"`);
        const rawItems = await scraper.search(query, 10);
        console.log(`    Found ${rawItems.length} items`);

        for (const raw of rawItems) {
          try {
            const normalized = scraper.normalize(raw);
            const cleaned = cleanProduct(normalized);
            if (cleaned.name && cleaned.price > 0) {
              await upsertComponent(cleaned);
              totalUpserted++;
            }
          } catch {
            // skip individual item errors
          }
        }

        // Rate limit between queries
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        console.error(`  [${scraper.name}] Search failed for "${query}": ${err}`);
      }
    }
  }

  console.log(`\nDone. Upserted ${totalUpserted} items.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
