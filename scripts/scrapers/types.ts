/** Shared scraper interface. Strategy pattern — one file per shop. */

export type RawProduct = Record<string, unknown>;

export type NormalizedProduct = {
  name: string;
  brand: string;
  category: string; // ComponentCategory value
  description: string | null;
  price: number; // VND
  originalPrice: number | null;
  currency: string; // always "VND"
  url: string;
  shop: string; // Shop enum value
  shopName: string;
  imageUrl: string | null;
  isAvailable: boolean;
  specs: Record<string, string>;
  colors: string[];
  styleTags: string[];
};

export interface Scraper {
  name: string;
  shop: string; // Shop enum value (e.g. "shopee")
  /** Search for products. Returns raw, unnormalized items. */
  search(query: string, limit?: number): Promise<RawProduct[]>;
  /** Normalize a raw item into a canonical shape. */
  normalize(raw: RawProduct): NormalizedProduct;
}
