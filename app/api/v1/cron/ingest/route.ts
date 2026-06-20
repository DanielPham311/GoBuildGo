import type { NextRequest } from "next/server";
import { getAllScrapers } from "@/scripts/scrapers";
import { cleanProduct } from "@/scripts/scrapers/clean";
import { prisma } from "@/shared/db";
import { slugify } from "@/lib/utils";
import { jsonError } from "@/shared/api/response";
import { NextResponse } from "next/server";

/** Default search queries covering all 9 categories. Runs weekly. */
const INGEST_QUERIES = [
  "gaming desk", "standing desk", "office desk",
  "gaming chair", "office chair", "ergonomic chair",
  "mechanical keyboard", "wireless keyboard",
  "gaming mouse", "wireless mouse",
  "gaming monitor", "4k monitor",
  "desk lamp", "led strip light",
  "gaming headset", "bluetooth speaker",
  "monitor arm", "cable management",
  "desk mat", "webcam",
];

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return jsonError("UNAUTHENTICATED", "Invalid cron secret");
  }

  const scrapers = getAllScrapers();
  let totalUpserted = 0;
  const errors: string[] = [];

  for (const scraper of scrapers) {
    for (const query of INGEST_QUERIES) {
      try {
        const rawItems = await scraper.search(query, 10);
        for (const raw of rawItems) {
          try {
            const cleaned = cleanProduct(scraper.normalize(raw));
            if (!cleaned.name || cleaned.price <= 0) continue;

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
                  imageUrl: cleaned.imageUrl,
                  isActive: true,
                  embeddingStale: true,
                },
              });

              await tx.price.upsert({
                where: {
                  componentId_shop_condition: {
                    componentId: comp.id,
                    shop: cleaned.shop as never,
                    condition: "new",
                  },
                },
                create: {
                  componentId: comp.id,
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
