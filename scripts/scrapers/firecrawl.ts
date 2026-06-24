/**
 * Firecrawl multi-shop crawler — implements the Scraper interface.
 *
 * Uses Firecrawl's search + scrape endpoints to discover and extract
 * product data from any shop URL. Reuses the existing normalization,
 * dedup, and upsert pipeline via scraper-run.ts.
 */

import type { Scraper, RawProduct, NormalizedProduct } from "./types";
import { firecrawlSearch, firecrawlScrape } from "./firecrawl-api";
import { extractProduct, extractFromSearchResult } from "./extract";
import { SEARCH_QUERIES } from "./queries";

const SHOP_NAME_MAP: Record<string, string> = {
  shopee: "Shopee",
  lazada: "Lazada",
  tiki: "Tiki",
  phongvu: "Phong Vũ",
  gearvn: "GearVN",
};

const SHOP_DOMAINS = [
  "shopee.vn",
  "lazada.vn",
  "tiki.vn",
  "phongvu.com.vn",
  "gearvn.com",
];

function isShopUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return SHOP_DOMAINS.some((d) => u.hostname === d || u.hostname === `www.${d}`);
  } catch {
    return false;
  }
}

function inferBrand(name: string): string {
  const KNOWN_BRANDS = [
    "Logitech", "Razer", "Corsair", "SteelSeries", "Keychron",
    "Dell", "LG", "Samsung", "Sony", "IKEA", "Secretlab",
    "Herman Miller", "BenQ", "ASUS", "MSI", "HyperX", "Philips",
    "Xiaomi", "Govee", "JBL", "Anker", "Pulsar", "Zowie",
    "FlexiSpot", "Sihoo", "Ergotron", "Leopold", "Grovemade",
    "Dareu", "VGN", "Akko", "Gateron", "KTC", "Outemu",
    "MCHOSE", "Womier", "Royal Kludge", "Epomaker", "DrunkDeer",
  ];
  const found = KNOWN_BRANDS.find((b) => name.toLowerCase().includes(b.toLowerCase()));
  return found ?? "Generic";
}

function inferCategory(name: string, fallback: string): string {
  const lower = name.toLowerCase();
  if (/bàn làm việc|bàn máy tính|desk|standing desk|bàn/i.test(lower)) return "desk";
  if (/ghế|ghế công thái học|chair|gaming chair|office chair/i.test(lower)) return "chair";
  if (/màn hình|monitor|display|screen/i.test(lower)) return "monitor";
  if (/bàn phím|keyboard|mechanical/i.test(lower)) return "keyboard";
  if (/chuột|chuột không dây|mouse/i.test(lower)) return "mouse";
  if (/đèn|light|lamp|led|rgb/i.test(lower)) return "lighting";
  if (/tai nghe|headset|headphone|speaker|loa/i.test(lower)) return "audio";
  if (/kệ|shelf|cable|decor|trang trí|plant|mat|pad/i.test(lower)) return "decor";
  return fallback;
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
    rgb: ["rgb"],
  };
  for (const [color, keywords] of Object.entries(COLOR_MAP)) {
    if (keywords.some((kw) => lower.includes(kw))) colors.push(color);
  }
  return colors;
}

function inferStyleTags(name: string): string[] {
  const tags: string[] = [];
  const lower = name.toLowerCase();
  if (/gaming|esport|game/i.test(lower)) tags.push("gaming");
  if (/office|văn phòng|công sở|work/i.test(lower)) tags.push("office");
  if (/minimal|minimalist|đơn giản|simple/i.test(lower)) tags.push("minimal");
  if (/rgb|led/i.test(lower)) tags.push("rgb");
  if (/pro|professional|chuyên nghiệp/i.test(lower)) tags.push("professional");
  if (/cao cấp|premium|luxury/i.test(lower)) tags.push("premium");
  if (/ergonomic|ergo/i.test(lower)) tags.push("ergonomic");
  if (/smart|thông minh/i.test(lower)) tags.push("smart");
  if (tags.length === 0) tags.push("versatile");
  return tags;
}

export const firecrawlCrawler: Scraper = {
  name: "Firecrawl",
  shop: "firecrawl",

  async search(query: string, limit = 10): Promise<RawProduct[]> {
    const results: RawProduct[] = [];
    const seenUrls = new Set<string>();

    // Find the category from the query config
    const queryConfig = SEARCH_QUERIES.find((q) => q.query === query);
    const category = queryConfig?.category ?? "accessory";

    console.log(`  [Firecrawl] Searching: "${query}"`);
    const searchResults = await firecrawlSearch(query, limit);
    console.log(`    Found ${searchResults.length} search results`);

    for (const result of searchResults) {
      if (seenUrls.has(result.url)) continue;
      seenUrls.add(result.url);

      // Skip non-shop URLs (articles, reviews, reddit, etc.)
      if (!isShopUrl(result.url)) {
        console.log(`    [skip] Non-shop URL: ${result.url}`);
        continue;
      }

      // Try full scrape first
      let extracted = null;
      try {
        // Rate limit: 1.5s between scrape calls
        await new Promise((r) => setTimeout(r, 1500));

        const scrapeResult = await firecrawlScrape(result.url);
        extracted = extractProduct(
          scrapeResult.markdown,
          result.url,
          { title: scrapeResult.title, ogImage: scrapeResult.ogImage },
        );
      } catch {
        // Scrape failed (CAPTCHA/block) — fall back to search result data
      }

      // If scrape failed or no price found, try extracting from search result
      if (!extracted || extracted.price === null) {
        extracted = extractFromSearchResult(result.title, result.description, result.url);
      }

      if (extracted && extracted.price !== null) {
        results.push({
          name: extracted.name,
          price: extracted.price,
          originalPrice: extracted.originalPrice,
          currency: extracted.currency,
          url: extracted.url,
          shop: extracted.shop,
          shopName: extracted.shopName,
          imageUrl: extracted.imageUrl,
          isAvailable: extracted.isAvailable,
          category,
          description: result.description,
        });
      }
    }

    console.log(`    Extracted ${results.length} valid products`);
    return results;
  },

  normalize(raw: RawProduct): NormalizedProduct {
    const name = String(raw.name ?? "");
    const category = inferCategory(name, String(raw.category ?? "accessory"));

    return {
      name: name
        .replace(/[\[\]【】()（）]/g, "")
        .replace(/\s+/g, " ")
        .replace(/\b(HÀNG CÓ SẴN|HÀNG CHÍNH HÃNG|FLASH SALE|GIẢM GIÁ|FREESHIP|MIỄN PHÍ VẬN CHUYỂN)\b/gi, "")
        .replace(/[-–—]\s*$/, "")
        .trim(),
      brand: inferBrand(name),
      category,
      description: raw.description ? String(raw.description).replace(/\s+/g, " ").trim() : null,
      price: Number(raw.price) || 0,
      originalPrice: raw.originalPrice ? Number(raw.originalPrice) : null,
      currency: String(raw.currency ?? "VND"),
      url: String(raw.url ?? ""),
      shop: String(raw.shop ?? "unknown"),
      shopName: String(raw.shopName ?? SHOP_NAME_MAP[String(raw.shop ?? "")] ?? "Unknown"),
      imageUrl: raw.imageUrl ? String(raw.imageUrl) : null,
      isAvailable: raw.isAvailable !== false,
      specs: {},
      colors: inferColors(name),
      styleTags: inferStyleTags(name),
    };
  },
};
