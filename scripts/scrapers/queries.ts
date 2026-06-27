/**
 * Search query config for Firecrawl crawler (hybrid mode).
 *
 * Strategy: search-only for Shopee/Lazada/Tiki (scrape blocked),
 * search + scrape fallback for PhongVu/GearVN.
 *
 * NOTE: Firecrawl's /search does NOT support Google `site:` operators.
 * Queries must be plain Vietnamese product keywords — Firecrawl returns
 * organic results from VN shops (Shopee, Lazada, Tiki, PhongVu, GearVN).
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
  // Desks
  {
    query: "bàn gaming bàn làm việc giá rẻ",
    category: "desk",
    limit: 10,
  },
  {
    query: "bàn máy tính gaming giá rẻ Việt Nam",
    category: "desk",
    limit: 10,
  },
  {
    query: "standing desk adjustable giá rẻ",
    category: "desk",
    limit: 10,
  },

  // Chairs
  {
    query: "ghế gaming ghế công thái học giá rẻ",
    category: "chair",
    limit: 10,
  },
  {
    query: "gaming chair ergonomic Việt Nam",
    category: "chair",
    limit: 10,
  },
  {
    query: "ghế xoay văn phòng giá rẻ",
    category: "chair",
    limit: 10,
  },

  // Monitors
  {
    query: "màn hình gaming 27 inch giá rẻ",
    category: "monitor",
    limit: 10,
  },
  {
    query: "gaming monitor 144hz Việt Nam",
    category: "monitor",
    limit: 10,
  },

  // Keyboards
  {
    query: "bàn phím cơ gaming giá rẻ",
    category: "keyboard",
    limit: 10,
  },
  {
    query: "mechanical keyboard switch blue Việt Nam",
    category: "keyboard",
    limit: 10,
  },

  // Mice
  {
    query: "chuột gaming chơi game giá rẻ",
    category: "mouse",
    limit: 10,
  },
  {
    query: "gaming mouse wireless Việt Nam",
    category: "mouse",
    limit: 10,
  },
];
