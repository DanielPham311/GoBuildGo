import type { Scraper, RawProduct, NormalizedProduct } from "./types";

/**
 * Shopee scraper — uses the unofficial search API.
 * Rate-limited, retry-friendly. Falls back gracefully on failure.
 */
const SHOPEE_API = "https://shopee.vn/api/v4/search/search_items";

export const shopeeScraper: Scraper = {
  name: "Shopee",
  shop: "shopee",

  async search(query: string, limit = 20): Promise<RawProduct[]> {
    const params = new URLSearchParams({
      keyword: query,
      limit: String(Math.min(limit, 50)),
      newest: "0",
      order: "desc",
      page_type: "search",
      scenario: "GLOBAL_SEARCH_PG",
    });

    const res = await fetch(`${SHOPEE_API}?${params}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "application/json",
        Referer: "https://shopee.vn/search",
      },
    });

    if (!res.ok) {
      throw new Error(`Shopee API returned ${res.status}`);
    }

    const data = (await res.json()) as { items?: RawProduct[] };
    return (data.items ?? []).map((i) => (i as { item_basic?: RawProduct }).item_basic ?? i);
  },

  normalize(raw: RawProduct): NormalizedProduct {
    const name = String(raw.name ?? "");
    return {
      name,
      brand: inferBrand(name, raw),
      category: inferCategory(name),
      description: null,
      // Shopee prices are in VND * 100000
      price: Math.round(((raw.price as number) ?? 0) / 100000),
      originalPrice: raw.original_price
        ? Math.round((raw.original_price as number) / 100000)
        : null,
      currency: "VND",
      url: buildShopeeUrl(raw),
      shop: "shopee",
      shopName: String(raw.shop_name ?? raw.name ?? "Shopee Seller"),
      imageUrl: raw.image ? `https://cf.shopee.vn/file/${raw.image}` : null,
      isAvailable: (raw.status as number) === 0,
      specs: {},
      colors: [],
      styleTags: [],
    };
  },
};

const KNOWN_BRANDS = [
  "Logitech", "Razer", "Corsair", "SteelSeries", "Keychron",
  "Dell", "LG", "Samsung", "Sony", "IKEA", "Secretlab",
  "Herman Miller", "BenQ", "ASUS", "MSI", "HyperX", "Philips",
  "Xiaomi", "Govee", "JBL", "Anker", "Pulsar", "Zowie",
  "FlexiSpot", "Sihoo", "Ergotron", "Leopold", "Grovemade",
];

function inferBrand(name: string, raw: RawProduct): string {
  if (raw.brand_name && raw.brand_name !== "No Brand") {
    return String(raw.brand_name);
  }
  const found = KNOWN_BRANDS.find((b) => name.toLowerCase().includes(b.toLowerCase()));
  return found ?? "Generic";
}

function inferCategory(name: string): string {
  const lower = name.toLowerCase();
  if (/bàn làm việc|desk|standing desk|bàn/i.test(lower)) return "desk";
  if (/ghế|chair|gaming chair|office chair/i.test(lower)) return "chair";
  if (/màn hình|monitor|display|screen/i.test(lower)) return "monitor";
  if (/bàn phím|keyboard|mechanical/i.test(lower)) return "keyboard";
  if (/chuột|mouse/i.test(lower)) return "mouse";
  if (/đèn|light|lamp|led|rgb/i.test(lower)) return "lighting";
  if (/tai nghe|headset|headphone|speaker|loa/i.test(lower)) return "audio";
  if (/kệ|shelf|cable|decor|trang trí|plant|mat|pad/i.test(lower)) return "decor";
  return "accessory";
}

function buildShopeeUrl(raw: RawProduct): string {
  const shopid = raw.shopid as number | undefined;
  const itemid = raw.itemid as number | undefined;
  if (shopid && itemid) {
    return `https://shopee.vn/product/${shopid}/${itemid}`;
  }
  return `https://shopee.vn/search?keyword=${encodeURIComponent(String(raw.name ?? ""))}`;
}
