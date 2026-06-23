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
