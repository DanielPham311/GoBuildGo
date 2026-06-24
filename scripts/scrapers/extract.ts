/**
 * Extract structured product data from Firecrawl markdown output.
 * Uses regex + heuristics to find prices, images, availability.
 */

const DOMAIN_TO_SHOP: Record<string, { shop: string; shopName: string }> = {
  "shopee.vn": { shop: "shopee", shopName: "Shopee Vietnam" },
  "lazada.vn": { shop: "lazada", shopName: "Lazada Vietnam" },
  "tiki.vn": { shop: "tiki", shopName: "Tiki" },
  "phongvu.com.vn": { shop: "phongvu", shopName: "Phong Vũ" },
  "gearvn.com": { shop: "gearvn", shopName: "GearVN" },
};

export type ExtractedProduct = {
  name: string;
  price: number | null;
  originalPrice: number | null;
  currency: string;
  imageUrl: string | null;
  shop: string;
  shopName: string;
  isAvailable: boolean;
  url: string;
};

/** Infer shop from URL domain. Returns "unknown" if not a tracked shop. */
function inferShop(url: string): { shop: string; shopName: string } {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return DOMAIN_TO_SHOP[hostname] ?? { shop: "unknown", shopName: hostname };
  } catch {
    return { shop: "unknown", shopName: "Unknown" };
  }
}

/** Parse Vietnamese price string to integer. */
function parsePrice(text: string): number | null {
  // Match patterns like: 2.500.000₫, 1,200,000 VND, 450.000đ, ₫199,000, 533.000 DAREU, 790.000.
  // Also matches: 1.200.000 (standalone VND-format number with dots as thousand separators)
  const match = text.match(/(?:₫\s*)?(\d{1,3}(?:[.,]\d{3})+)\s*(₫|VND|đ|đồng|DAREU)?/i);
  if (!match) {
    // Fallback: any 6+ digit number that looks like a VND price (has dots)
    const fallback = text.match(/(\d{1,3}(?:\.\d{3}){2,})/);
    if (!fallback) return null;
    const num = parseInt(fallback[1].replace(/\./g, ""), 10);
    return isNaN(num) || num <= 0 ? null : num;
  }
  const raw = match[1];
  // Remove thousand separators (both . and ,)
  const cleaned = raw.replace(/[.,]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) || num <= 0 ? null : num;
}

/** Extract price from markdown content. Looks for prominent price patterns. */
function extractPrices(markdown: string): { price: number | null; originalPrice: number | null } {
  let price: number | null = null;
  let originalPrice: number | null = null;

  // Look for original price in strikethrough: ~~2.500.000₫~~ or ~~1.200.000 VND~~
  const strikeMatch = markdown.match(/~~\s*(\d[\d.,]+)\s*(₫|VND|đ)~~/i);
  if (strikeMatch) {
    const raw = strikeMatch[1].replace(/[.,]/g, "");
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num > 0) originalPrice = num;
  }

  // Look for "giá gốc" or "giá niêm yết" label
  const giaGocMatch = markdown.match(/giá\s*(gốc|niêm\s*yết|bán|lẻ)[:\s]*(\d[\d.,]+)\s*(₫|VND|đ)/i);
  if (giaGocMatch) {
    const raw = giaGocMatch[2].replace(/[.,]/g, "");
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num > 0) originalPrice = num;
  }

  // Look for current/sale price: "giá bán", "giá khuyến mãi", or just prominent price
  const pricePatterns = [
    /giá\s*(bán|khuyến\s*mãi|sale|giảm)[:\s]*(?:₫\s*)?(\d{1,3}(?:[.,]\d{3})+)/i,
    /(?:₫\s*)?(\d{1,3}(?:[.,]\d{3})+)\s*(₫|VND|đ|DAREU)?/i,
    /(\d{1,3}(?:\.\d{3}){2,})/,
  ];

  for (const pattern of pricePatterns) {
    const match = markdown.match(pattern);
    if (match) {
      const raw = match[1].replace(/[.,]/g, "");
      const num = parseInt(raw, 10);
      if (!isNaN(num) && num >= 10000) {
        price = num;
        break;
      }
    }
  }

  // If we have original but no current, they're the same
  if (price === null && originalPrice !== null) {
    price = originalPrice;
  }

  return { price, originalPrice };
}

/** Extract first image URL from markdown content. */
function extractImage(markdown: string, ogImage: string | null): string | null {
  if (ogImage) return ogImage;
  const imgMatch = markdown.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/);
  return imgMatch?.[1] ?? null;
}

/** Check if product is unavailable based on keywords. */
function checkAvailability(markdown: string): boolean {
  const lower = markdown.toLowerCase();
  const unavailablePatterns = [
    "hết hàng",
    "out of stock",
    "đã hết",
    "không còn hàng",
    "tạm hết",
    "sold out",
    "unavailable",
  ];
  return !unavailablePatterns.some((p) => lower.includes(p));
}

/** Extract product name from title or first heading. */
function extractName(title: string, markdown: string): string {
  // Prefer the page title (from Firecrawl metadata)
  if (title) {
    return title
      .replace(/\s*[|\-–—]\s*(Shopee|Lazada|Tiki|PhongVu|GearVN|Vietnam|VN).*$/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  // Fallback: first markdown heading
  const headingMatch = markdown.match(/^#\s+(.+)$/m);
  if (headingMatch) {
    return headingMatch[1].replace(/\s+/g, " ").trim();
  }
  return "Unknown Product";
}

/**
 * Extract a product from Firecrawl markdown + metadata.
 * Returns null if the content doesn't look like a product page.
 */
export function extractProduct(
  markdown: string,
  url: string,
  meta: { title: string; ogImage: string | null },
): ExtractedProduct | null {
  const { shop, shopName } = inferShop(url);
  if (shop === "unknown") return null;

  const name = extractName(meta.title, markdown);
  const { price, originalPrice } = extractPrices(markdown);
  const imageUrl = extractImage(markdown, meta.ogImage);
  const isAvailable = checkAvailability(markdown);

  // Skip if no price found — not a useful product
  if (price === null) return null;

  return {
    name,
    price,
    originalPrice,
    currency: "VND",
    imageUrl,
    shop,
    shopName,
    isAvailable,
    url,
  };
}

/**
 * Extract a product from Firecrawl search result metadata alone.
 * Many shops block scraping, so we use search result title + description
 * as the primary data source. Price is often in the description snippet.
 */
export function extractFromSearchResult(
  title: string,
  description: string,
  url: string,
): ExtractedProduct | null {
  const { shop, shopName } = inferShop(url);
  if (shop === "unknown") return null;

  // Clean product name from title
  const name = title
    .replace(/\s*[|\-–—]\s*(Shopee|Lazada|Tiki|PhongVu|GearVN|Vietnam|VN|Mua|Giá).*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!name || name.length < 5) return null;

  // Try to extract price from description first, then title (Tiki often has price in title)
  let { price, originalPrice } = extractPrices(description);
  if (price === null) {
    const titlePrice = extractPrices(title);
    price = titlePrice.price;
    originalPrice = titlePrice.originalPrice;
  }

  // Skip if no price found
  if (price === null) return null;

  return {
    name,
    price,
    originalPrice,
    currency: "VND",
    imageUrl: null,
    shop,
    shopName,
    isAvailable: true,
    url,
  };
}
