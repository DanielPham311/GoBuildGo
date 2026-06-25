/**
 * Search query config for Firecrawl crawler (hybrid mode).
 *
 * Strategy: search-only for Shopee/Lazada/Tiki (scrape blocked),
 * search + scrape fallback for PhongVu/GearVN.
 *
 * 12 queries × 1 credit/search = ~12 credits/run.
 * Daily schedule: ~360 credits/month (within 1000 free tier).
 */

export type SearchQuery = {
  query: string;
  category: "desk" | "chair" | "monitor" | "keyboard" | "mouse" | "lighting" | "audio" | "decor";
  limit: number;
};

export const SEARCH_QUERIES: SearchQuery[] = [
  // Desks — shopee/lazada have best price-in-description coverage
  {
    query: "bàn gaming bàn làm việc giá site:shopee.vn",
    category: "desk",
    limit: 10,
  },
  {
    query: "bàn gaming giá rẻ site:lazada.vn",
    category: "desk",
    limit: 10,
  },
  {
    query: "standing desk adjustable site:gearvn.com",
    category: "desk",
    limit: 10,
  },

  // Chairs
  {
    query: "ghế gaming giá rẻ site:shopee.vn",
    category: "chair",
    limit: 10,
  },
  {
    query: "gaming chair ergonomic site:lazada.vn",
    category: "chair",
    limit: 10,
  },
  {
    query: "ghế gaming giá site:gearvn.com",
    category: "chair",
    limit: 10,
  },

  // Monitors
  {
    query: "màn hình gaming giá site:shopee.vn",
    category: "monitor",
    limit: 10,
  },
  {
    query: "gaming monitor 27 inch site:lazada.vn",
    category: "monitor",
    limit: 10,
  },

  // Keyboards
  {
    query: "bàn phím cơ giá rẻ site:shopee.vn",
    category: "keyboard",
    limit: 10,
  },
  {
    query: "mechanical keyboard site:lazada.vn",
    category: "keyboard",
    limit: 10,
  },

  // Mice
  {
    query: "chuột gaming giá rẻ site:shopee.vn",
    category: "mouse",
    limit: 10,
  },
  {
    query: "gaming mouse wireless site:lazada.vn",
    category: "mouse",
    limit: 10,
  },
];
