/**
 * Search query config for Firecrawl crawler.
 * Each query targets a category with site: operators to find products
 * across all 5 shops (Shopee, Lazada, Tiki, PhongVu, GearVN).
 *
 * Budget: 10 products/category × 8 categories = ~80 products/run.
 * With ~88 Firecrawl credits/run → ~11 runs/month → every ~2.5 days.
 */

export type SearchQuery = {
  query: string;
  category: "desk" | "chair" | "monitor" | "keyboard" | "mouse" | "lighting" | "audio" | "decor";
  limit: number;
};

export const SEARCH_QUERIES: SearchQuery[] = [
  // Desks
  {
    query: "gaming desk standing desk site:shopee.vn OR site:lazada.vn OR site:tiki.vn",
    category: "desk",
    limit: 10,
  },
  {
    query: "bàn làm việc bàn gaming site:shopee.vn OR site:lazada.vn",
    category: "desk",
    limit: 10,
  },
  {
    query: "standing desk adjustable height site:phongvu.com.vn OR site:gearvn.com",
    category: "desk",
    limit: 10,
  },

  // Chairs
  {
    query: "gaming chair ergonomic office chair giá site:shopee.vn OR site:lazada.vn",
    category: "chair",
    limit: 10,
  },
  {
    query: "ghế gaming ghế công thái học giá rẻ site:shopee.vn",
    category: "chair",
    limit: 10,
  },
  {
    query: "gaming chair giá site:gearvn.com OR site:phongvu.com.vn",
    category: "chair",
    limit: 10,
  },

  // Monitors
  {
    query: "gaming monitor 27 inch 144hz site:shopee.vn OR site:lazada.vn OR site:tiki.vn",
    category: "monitor",
    limit: 10,
  },
  {
    query: "màn hình gaming 27 inch site:shopee.vn",
    category: "monitor",
    limit: 10,
  },
  {
    query: "monitor gaming site:gearvn.com OR site:phongvu.com.vn",
    category: "monitor",
    limit: 10,
  },

  // Keyboards
  {
    query: "mechanical keyboard custom switch site:shopee.vn OR site:lazada.vn OR site:tiki.vn",
    category: "keyboard",
    limit: 10,
  },
  {
    query: "bàn phím cơ mechanical keyboard site:shopee.vn",
    category: "keyboard",
    limit: 10,
  },
  {
    query: "keyboard gaming site:gearvn.com OR site:phongvu.com.vn",
    category: "keyboard",
    limit: 10,
  },

  // Mice
  {
    query: "gaming mouse wireless lightweight site:shopee.vn OR site:lazada.vn OR site:tiki.vn",
    category: "mouse",
    limit: 10,
  },
  {
    query: "chuột gaming không dây site:shopee.vn",
    category: "mouse",
    limit: 10,
  },
  {
    query: "gaming mouse site:gearvn.com OR site:phongvu.com.vn",
    category: "mouse",
    limit: 10,
  },

  // Lighting
  {
    query: "led strip desk lamp rgb site:shopee.vn OR site:lazada.vn OR site:tiki.vn",
    category: "lighting",
    limit: 10,
  },
  {
    query: "đèn led bàn rgb site:shopee.vn",
    category: "lighting",
    limit: 10,
  },
  {
    query: "led lighting site:gearvn.com OR site:phongvu.com.vn",
    category: "lighting",
    limit: 10,
  },

  // Audio
  {
    query: "gaming headset bluetooth speaker site:shopee.vn OR site:lazada.vn OR site:tiki.vn",
    category: "audio",
    limit: 10,
  },
  {
    query: "tai nghe gaming loa bluetooth site:shopee.vn",
    category: "audio",
    limit: 10,
  },
  {
    query: "headset speaker site:gearvn.com OR site:phongvu.com.vn",
    category: "audio",
    limit: 10,
  },

  // Decor
  {
    query: "desk organizer shelf plant decor site:shopee.vn OR site:lazada.vn OR site:tiki.vn",
    category: "decor",
    limit: 10,
  },
  {
    query: "kệ bàn trang trí desk mat site:shopee.vn",
    category: "decor",
    limit: 10,
  },
  {
    query: "desk decor site:gearvn.com OR site:phongvu.com.vn",
    category: "decor",
    limit: 10,
  },
];
