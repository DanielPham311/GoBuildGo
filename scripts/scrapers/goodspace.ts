/**
 * GoodSpace crawler — direct category page scraping.
 *
 * goodspace.art is server-rendered, so Firecrawl's /scrape returns full
 * product listing markdown. Each product card follows a predictable pattern:
 *
 *   [![Name](image-url)
 *   \
 *   Mua ngay
 *   \
 *   Name
 *   \
 *   TừX.XXX.000
 *   \
 *   Y.YYY.000-Z%](product-url)
 *
 * We parse all products from a category page in one scrape (~5 credits).
 */

import type { Scraper, RawProduct, NormalizedProduct } from "./types";
import { firecrawlScrape } from "./firecrawl-api";

const GOODSPACE_CATEGORIES = [
  { slug: "ghe-cong-thai-hoc", category: "chair" },
  { slug: "ban-nang-ha", category: "desk" },
  { slug: "phu-kien-va-setup", category: "decor" },
  { slug: "arm-man-hinh", category: "decor" },
  { slug: "luu-tru", category: "decor" },
  { slug: "balo-tui", category: "decor" },
];

const SHOP = "goodspace";
const SHOP_NAME = "GoodSpace";

// Match each product card in the markdown.
// Firecrawl renders line breaks as literal \\<newline> sequences.
// Full product block:
//   ![Name](image-url)\\n\\Mua ngay\\n\\Name\\n\\TừX.XXX.000\\n\\Y.YYY.000-Z%](url)
const PRODUCT_PATTERN = /!\[([^\]]*)\]\((https?:\/\/imagor\.goodspace\.art[^)]+)\)\s*\\\\\n\\\\\s*\n\s*Mua ngay\s*\\\\\n\\\\\s*\n\s*(.+?)\s*\\\\\n\\\\\s*\n\s*Từ([\d.,]+)\s*\\\\\n\\\\\s*\n\s*([\d.,]+)-(\d+)%\]\((https?:\/\/goodspace\.art\/[^\s)]+)\)/g;

function parseVndPrice(text: string): number {
  const cleaned = text.replace(/[.,]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) || num <= 0 ? 0 : num;
}

function inferBrand(name: string): string {
  const KNOWN_BRANDS = [
    "Ergohuman", "Sihoo", "Ergotron", "FlexiSpot", "IKEA",
    "Herman Miller", "Steelcase", "Secretlab", "Logitech",
    "BenQ", "Dell", "LG", "Samsung", "Xiaomi", "Anker",
    "Uplift", "Vari", "Autonomous", "Branch", "Deskhaus",
  ];
  const found = KNOWN_BRANDS.find((b) => name.toLowerCase().includes(b.toLowerCase()));
  return found ?? "Generic";
}

function inferColors(name: string): string[] {
  const colors: string[] = [];
  const lower = name.toLowerCase();
  const COLOR_MAP: Record<string, string[]> = {
    black: ["đen", "black"],
    white: ["trắng", "white"],
    red: ["đỏ", "red"],
    blue: ["xanh dương", "blue"],
    green: ["xanh lá", "green"],
    pink: ["hồng", "pink"],
    silver: ["bạc", "silver"],
    gray: ["xám", "gray", "grey"],
    gold: ["vàng", "gold"],
    wood: ["gỗ", "wood"],
  };
  for (const [color, keywords] of Object.entries(COLOR_MAP)) {
    if (keywords.some((kw) => lower.includes(kw))) colors.push(color);
  }
  return colors;
}

function inferStyleTags(name: string, category: string): string[] {
  const tags: string[] = [];
  const lower = name.toLowerCase();
  if (/gaming|esport|game/i.test(lower)) tags.push("gaming");
  if (/office|văn phòng|công sở|work|ergonomic|ergo/i.test(lower)) tags.push("office");
  if (/minimal|minimalist|đơn giản|simple/i.test(lower)) tags.push("minimal");
  if (/pro|professional|chuyên nghiệp/i.test(lower)) tags.push("professional");
  if (/cao cấp|premium|luxury/i.test(lower)) tags.push("premium");
  if (/smart|thông minh/i.test(lower)) tags.push("smart");
  if (/standing|adjustable|nâng hạ/i.test(lower)) tags.push("adjustable");
  if (tags.length === 0) tags.push(category === "chair" ? "ergonomic" : "versatile");
  return tags;
}

export const goodspaceScraper: Scraper = {
  name: "GoodSpace",
  shop: SHOP,

  async search(query: string, _limit = 10): Promise<RawProduct[]> {
    // The "search" query is ignored — we always scrape all category pages.
    // This method exists to satisfy the Scraper interface.
    const results: RawProduct[] = [];

    for (const cat of GOODSPACE_CATEGORIES) {
      const url = `https://goodspace.art/${cat.slug}`;
      console.log(`  [GoodSpace] Scraping category: ${url}`);

      try {
        const { markdown } = await firecrawlScrape(url);
        const products = parseCategoryPage(markdown, cat.category);
        console.log(`    Found ${products.length} products in ${cat.slug}`);
        results.push(...products);
      } catch (err) {
        console.error(`    [GoodSpace] Failed to scrape ${cat.slug}: ${err}`);
      }

      // Rate limit: 1.5s between pages
      await new Promise((r) => setTimeout(r, 1500));
    }

    void query;
    void _limit;
    return results;
  },

  normalize(raw: RawProduct): NormalizedProduct {
    const name = String(raw.name ?? "");
    const category = String(raw.category ?? "decor");

    return {
      name: name.replace(/\s+/g, " ").trim(),
      brand: inferBrand(name),
      category,
      description: null,
      price: Number(raw.price) || 0,
      originalPrice: raw.originalPrice ? Number(raw.originalPrice) : null,
      currency: "VND",
      url: String(raw.url ?? ""),
      shop: SHOP,
      shopName: SHOP_NAME,
      imageUrl: raw.imageUrl ? String(raw.imageUrl) : null,
      isAvailable: true,
      specs: {},
      colors: inferColors(name),
      styleTags: inferStyleTags(name, category),
    };
  },
};

function parseCategoryPage(markdown: string, category: string): RawProduct[] {
  const products: RawProduct[] = [];
  const seenUrls = new Set<string>();

  let match: RegExpExecArray | null;
  PRODUCT_PATTERN.lastIndex = 0;
  while ((match = PRODUCT_PATTERN.exec(markdown)) !== null) {
    const [, , imageUrl, name, salePrice, originalPrice, , url] = match;
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    const price = parseVndPrice(salePrice);
    if (price === 0) continue;

    products.push({
      name: name.trim(),
      price,
      originalPrice: parseVndPrice(originalPrice),
      currency: "VND",
      url,
      shop: SHOP,
      shopName: SHOP_NAME,
      imageUrl,
      category,
    });
  }

  return products;
}
