/**
 * Search query config for Firecrawl crawler.
 *
 * NOTE: Firecrawl's /search does NOT support Google `site:` operators.
 * Queries must be plain Vietnamese product keywords.
 *
 * These queries target items NOT available on GoodSpace:
 * monitors, keyboards, mice, lighting, audio.
 */

export type SearchQuery = {
  query: string;
  category: "desk" | "chair" | "monitor" | "keyboard" | "mouse" | "lighting" | "audio" | "decor";
  limit: number;
};

export const SEARCH_QUERIES: SearchQuery[] = [
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
  {
    query: "màn hình 2k 27 inch giá rẻ",
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

  // Lighting
  {
    query: "đèn led setup gaming rgb",
    category: "lighting",
    limit: 10,
  },

  // Audio
  {
    query: "tai nghe gaming giá rẻ",
    category: "audio",
    limit: 10,
  },
];
