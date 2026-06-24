/**
 * Daily price snapshot — inserts current price as a no-change record
 * for every active price. Ensures chart continuity.
 *
 * Implements database-design.md §4.4:
 *   INSERT INTO price_history (price_id, old_price, new_price, recorded_at)
 *     SELECT id, price, price, now() FROM prices;
 *
 * Usage:
 *   npx tsx scripts/snapshot.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function main() {
  console.log("📸 Daily price snapshot");
  console.log("═══════════════════════════════════════════");

  const startedAt = Date.now();

  // Insert current price as both old and new (no-change record)
  // This ensures at least one data point per day for every price
  const result = await prisma.$executeRawUnsafe(
    `INSERT INTO price_history (price_id, old_price, new_price, recorded_at)
     SELECT id, price, price, now() FROM prices WHERE "isAvailable" = true`,
  );

  const duration = Date.now() - startedAt;

  console.log(`✅ Snapshot complete: ${result} records inserted in ${duration}ms`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
