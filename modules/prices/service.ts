import { prisma } from "@/shared/db";

export class PriceError extends Error {
  constructor(
    public code: "NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "PriceError";
  }
}

/** Component + all its shop prices, ordered cheapest first. Throws if missing. */
export async function getComponentPrices(componentId: string) {
  const component = await prisma.component.findUnique({
    where: { id: componentId },
    include: { prices: { orderBy: { price: "asc" } } },
  });
  if (!component) throw new PriceError("NOT_FOUND", "Component not found");
  return component;
}

/** A single price row by id, with its component (for affiliate redirect). */
export async function getPrice(priceId: string) {
  const price = await prisma.price.findUnique({ where: { id: priceId } });
  if (!price) throw new PriceError("NOT_FOUND", "Price not found");
  return price;
}

/**
 * Per-shop price history for a component. PriceHistory rows record change
 * events (oldPrice → newPrice); we turn each price's events into a time series
 * and append the current price as the latest point. Throws if the component
 * has no prices.
 */
export async function getComponentPriceHistory(componentId: string) {
  const prices = await prisma.price.findMany({
    where: { componentId },
    include: { priceHistories: { orderBy: { recordedAt: "asc" } } },
    orderBy: { price: "asc" },
  });
  if (prices.length === 0) throw new PriceError("NOT_FOUND", "No prices for this component");

  return prices.map((p) => {
    const points: { price: number; at: Date }[] = [];

    // Seed with the oldest known price (the first change's oldPrice), else the
    // creation point at the current price.
    const first = p.priceHistories[0];
    if (first) {
      points.push({ price: Number(first.oldPrice), at: p.createdAt });
      for (const h of p.priceHistories) {
        points.push({ price: Number(h.newPrice), at: h.recordedAt });
      }
    } else {
      points.push({ price: Number(p.price), at: p.createdAt });
    }

    return {
      shop: p.shop,
      shopName: p.shopName,
      currentPrice: Number(p.price),
      points,
    };
  });
}

/** Record an affiliate click. Fire-and-forget from the caller. */
export async function recordAffiliateClick(args: {
  componentId: string;
  shop: string;
  userId?: string;
  setupId?: string;
  referrer?: string;
  ipHash?: string;
}) {
  await prisma.affiliateClick.create({
    data: {
      componentId: args.componentId,
      shop: args.shop,
      userId: args.userId,
      setupId: args.setupId,
      referrer: args.referrer,
      ipHash: args.ipHash,
    },
  });
}
