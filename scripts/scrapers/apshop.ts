/**
 * APShop direct category scraper.
 *
 * apshop.vn is server-rendered (Haravan platform). Firecrawl's /scrape returns
 * full product listing markdown with predictable card structure:
 *
 *   -XX% [![Name](img1) ![img2)](/products/slug "Name")
 *   ### [Name](/products/slug "Name")
 *   N đánh giá
 *   ~~ORIGINAL₫~~ SALE₫
 *   Mua ngay
 *
 * We parse all products per category page (~5 credits/page).
 */

import type { Scraper, RawProduct, NormalizedProduct } from "./types";
import { firecrawlScrape } from "./firecrawl-api";

const APSHOP_CATEGORIES = [
  { slug: "ban-ghe", category: "desk" },
  { slug: "ghe-gaming", category: "chair" },
  { slug: "man-hinh-pc", category: "monitor" },
  { slug: "ban-phim-co", category: "keyboard" },
  { slug: "chuot-gaming", category: "mouse" },
  { slug: "tai-nghe-gaming", category: "audio" },
  { slug: "phu-kien", category: "decor" },
];

const SHOP = "apshop";
const SHOP_NAME = "APShop";

function parseVndPrice(text: string): number {
  const cleaned = text.replace(/[.,]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) || num <= 0 ? 0 : num;
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
    "Cougar", "E-Dra", "Glorious", "IQUNIX", "Thermaltake",
    "MOZA", "ThrustMaster", "Creative", "Edifier", "Sennheiser",
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

export const apshopScraper: Scraper = {
  name: "APShop",
  shop: SHOP,

  async search(query: string, _limit = 10): Promise<RawProduct[]> {
    // Query ignored — we always scrape all category pages directly.
    const results: RawProduct[] = [];

    for (const cat of APSHOP_CATEGORIES) {
      const url = `https://apshop.vn/collections/${cat.slug}`;
      console.log(`  [APShop] Scraping category: ${url}`);

      try {
        const { markdown } = await firecrawlScrape(url);
        const products = parseCategoryPage(markdown, cat.category);
        console.log(`    Found ${products.length} products in ${cat.slug}`);
        results.push(...products);
      } catch (err) {
        console.error(`    [APShop] Failed to scrape ${cat.slug}: ${err}`);
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
  const seenSlugs = new Set<string>();

  // Split markdown into product blocks on the discount marker "-XX% ["
  const blocks = markdown.split(/(?=-\d+%\s*\[)/g);

  for (const block of blocks) {
    if (!block.trim()) continue;

    // Extract name from first ![Name](
    const nameMatch = block.match(/^-\d+%\s*\[!\[([^\]]*)\]\(/m);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim();
    if (!name || name.length < 3) continue;

    // Extract image URL from first image
    const imgMatch = block.match(/^-\d+%\s*\[!\[[^\]]*\]\((https?:\/\/[^)\s]+)/m);
    const imageUrl = imgMatch?.[1] ?? null;

    // Extract product slug from /products/slug links
    // Find all /products/ links and take the first one (product URL)
    const slugMatches = [...block.matchAll(/\/products\/([^"\s)]+)/g)];
    if (slugMatches.length === 0) continue;
    const slug = slugMatches[0][1];
    if (seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);

    // Extract prices. APShop formats:
    //   ~~ORIGINAL₫~~ SALE₫  (discounted)
    //   ORIGINAL₫ SALE₫      (two prices, no strikethrough)
    //   SALE₫                (single price, no discount)
    let originalPrice: number | null = null;
    let price = 0;

    const strikethroughPrice = block.match(/~~([\d.,]+)₫~~\s*([\d.,]+)₫/);
    if (strikethroughPrice) {
      originalPrice = parseVndPrice(strikethroughPrice[1]);
      price = parseVndPrice(strikethroughPrice[2]);
    } else {
      const twoPrices = block.match(/^([\d.,]+)₫\s+([\d.,]+)₫/m);
      if (twoPrices) {
        originalPrice = parseVndPrice(twoPrices[1]);
        price = parseVndPrice(twoPrices[2]);
      } else {
        const singlePrice = block.match(/([\d.,]+)₫\s*\n\s*Mua/);
        if (singlePrice) {
          price = parseVndPrice(singlePrice[1]);
        }
      }
    }

    if (price === 0) continue;

    products.push({
      name,
      price,
      originalPrice,
      currency: "VND",
      url: `https://apshop.vn/products/${slug}`,
      shop: SHOP,
      shopName: SHOP_NAME,
      imageUrl,
      category,
    });
  }

  return products;
}
