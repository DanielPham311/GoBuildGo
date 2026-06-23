import type { Price, Component } from "@prisma/client";
import { affiliateUrl } from "./affiliate";

function discountPct(price: Price): number {
  if (!price.originalPrice) return 0;
  const orig = Number(price.originalPrice);
  const cur = Number(price.price);
  if (orig <= 0 || cur >= orig) return 0;
  return Math.round(((orig - cur) / orig) * 100);
}

type ShopHistory = {
  shop: string;
  shopName: string | null;
  currentPrice: number;
  points: { price: number; at: Date }[];
};

/** Price-history response: one series per shop, points sorted oldest → newest. */
export function toPriceHistory(componentId: string, series: ShopHistory[]) {
  return {
    componentId,
    series: series.map((s) => ({
      shop: s.shop,
      shopName: s.shopName,
      currentPrice: s.currentPrice,
      points: s.points.map((pt) => ({ price: pt.price, at: pt.at.toISOString() })),
    })),
  };
}

/** Price-comparison response for a component (API_DESIGN.md §7). */
export function toPriceComparison(component: Component & { prices: Price[] }) {
  const prices = component.prices.map((p) => ({
    shop: p.shop,
    price: Number(p.price),
    originalPrice: p.originalPrice ? Number(p.originalPrice) : Number(p.price),
    discount: discountPct(p),
    currency: p.currency,
    url: p.url,
    affiliateUrl: affiliateUrl(p.id, component.id, p.shop),
    inStock: p.isAvailable,
    lastUpdated: p.lastUpdated,
  }));
  const amounts = prices.map((p) => p.price);
  return {
    componentId: component.id,
    componentName: component.name,
    prices,
    lowestPrice: amounts.length ? Math.min(...amounts) : null,
    highestPrice: amounts.length ? Math.max(...amounts) : null,
    lastUpdated: component.prices[0]?.lastUpdated ?? null,
  };
}
