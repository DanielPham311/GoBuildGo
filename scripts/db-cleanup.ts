/**
 * Clean up DB: remove prices from removed shops and orphaned components.
 *
 * Shops we keep: goodspace, apshop
 * Shops to remove: phongvu, gearvn, nhaxinh, shopee, lazada, tiki
 *
 * Steps:
 * 1. Delete price_history rows for prices being removed
 * 2. Delete prices from removed shops
 * 3. Delete components that have no remaining prices
 * 4. Delete affiliate clicks for removed components
 * 5. Delete setup items for removed components
 * 6. Report counts
 */

import { PrismaClient } from "@prisma/client";

const REMOVED_SHOPS = ["phongvu", "gearvn", "nhaxinh", "shopee", "lazada", "tiki"] as const;

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Cleaning up DB — removing data from removed shops…\n");

  for (const shop of REMOVED_SHOPS) {
    // Count prices for this shop
    const priceCount = await prisma.price.count({
      where: { shop: shop as never },
    });
    if (priceCount === 0) {
      console.log(`  ${shop}: no prices found — skipping`);
      continue;
    }

    // Get price IDs for this shop (needed to delete price_history)
    const prices = await prisma.price.findMany({
      where: { shop: shop as never },
      select: { id: true },
    });
    const priceIds = prices.map((p) => p.id);

    // Delete price history for these prices
    const historyDeleted = await prisma.priceHistory.deleteMany({
      where: { priceId: { in: priceIds } },
    });

    // Delete the prices
    const pricesDeleted = await prisma.price.deleteMany({
      where: { shop: shop as never },
    });

    console.log(`  ${shop}: deleted ${pricesDeleted.count} prices, ${historyDeleted.count} price history records`);
  }

  // Find components with no remaining prices
  const componentsWithPrices = await prisma.component.findMany({
    select: { id: true },
    where: { prices: { some: {} } },
  });
  const componentIdsWithPrices = new Set(componentsWithPrices.map((c) => c.id));

  const allComponents = await prisma.component.findMany({
    select: { id: true },
  });
  const orphanedIds = allComponents
    .filter((c) => !componentIdsWithPrices.has(c.id))
    .map((c) => c.id);

  if (orphanedIds.length === 0) {
    console.log("\n  No orphaned components found.");
  } else {
    console.log(`\n  Found ${orphanedIds.length} orphaned components (no prices). Cleaning up…`);

    // Delete affiliate clicks for orphaned components
    const clicksDeleted = await prisma.affiliateClick.deleteMany({
      where: { componentId: { in: orphanedIds } },
    });
    console.log(`    Deleted ${clicksDeleted.count} affiliate clicks`);

    // Delete setup items for orphaned components
    const setupItemsDeleted = await prisma.setupItem.deleteMany({
      where: { componentId: { in: orphanedIds } },
    });
    console.log(`    Deleted ${setupItemsDeleted.count} setup items`);

    // Delete favorites for orphaned components
    const favsDeleted = await prisma.userFavorite.deleteMany({
      where: { componentId: { in: orphanedIds } },
    });
    console.log(`    Deleted ${favsDeleted.count} favorites`);

    // Delete theme components for orphaned components
    const themeCompsDeleted = await prisma.themeComponent.deleteMany({
      where: { componentId: { in: orphanedIds } },
    });
    console.log(`    Deleted ${themeCompsDeleted.count} theme components`);

    // Delete the orphaned components
    const compsDeleted = await prisma.component.deleteMany({
      where: { id: { in: orphanedIds } },
    });
    console.log(`    Deleted ${compsDeleted.count} components`);
  }

  // Summary
  const remaining = await prisma.component.count();
  const remainingPrices = await prisma.price.count();
  console.log(`\n✅ Done. Remaining: ${remaining} components, ${remainingPrices} prices.`);

  // Show remaining by shop
  const byShop = await prisma.price.groupBy({
    by: ["shop"],
    _count: true,
  });
  console.log("\n  Prices by shop:");
  for (const row of byShop) {
    console.log(`    ${row.shop}: ${row._count}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
