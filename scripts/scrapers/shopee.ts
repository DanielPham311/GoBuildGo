import type { Scraper, RawProduct, NormalizedProduct } from "./types";

/**
 * Shopee scraper — uses the unofficial search API.
 * Retry with backoff, rotating User-Agent. Falls back gracefully on failure.
 */
const SHOPEE_API = "https://shopee.vn/api/v4/search/search_items";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
];

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function pickUA(index: number): string {
  return USER_AGENTS[index % USER_AGENTS.length];
}

async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
): Promise<Response> {
  let lastErr: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      headers: {
        ...headers,
        "User-Agent": pickUA(attempt),
      },
    });

    // Success
    if (res.ok) return res;

    // Rate limited — backoff
    if (res.status === 429 || res.status === 503) {
      const backoff = RETRY_BASE_MS * (attempt + 1);
      console.warn(`  [Shopee] ${res.status} — retrying in ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(backoff);
      continue;
    }

    // Server error — backoff
    if (res.status >= 500) {
      const backoff = RETRY_BASE_MS * (attempt + 1);
      console.warn(`  [Shopee] ${res.status} — retrying in ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(backoff);
      continue;
    }

    // Client error (4xx except 429) — don't retry
    lastErr = new Error(`Shopee API returned ${res.status}`);
    break;
  }

  throw lastErr ?? new Error("Shopee API failed after retries");
}

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

    const res = await fetchWithRetry(`${SHOPEE_API}?${params}`, {
      Accept: "application/json",
      Referer: "https://shopee.vn/search",
    });

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
  if (/bàn làm việc|bàn máy tính|desk|standing desk|bàn/i.test(lower)) return "desk";
  if (/ghế|ghế công thái học|chair|gaming chair|office chair/i.test(lower)) return "chair";
  if (/màn hình|monitor|display|screen/i.test(lower)) return "monitor";
  if (/bàn phím|keyboard|mechanical/i.test(lower)) return "keyboard";
  if (/chuột|chuột không dây|mouse/i.test(lower)) return "mouse";
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
