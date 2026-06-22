// API-safe shapes for the visualize flow.

/** Best (cheapest available) buy offer for an item. */
export type BuyOffer = {
  shop: string;
  price: number; // VND
  url: string; // affiliate/shop link
  affiliateUrl: string; // signed internal redirect URL
};

export type RetrievedItem = {
  id: string;
  category: string;
  brand: string;
  name: string;
  description: string | null;
  colors: string[];
  styleTags: string[];
  imageUrl: string | null;
  similarity: number; // 0..1 cosine similarity
  offer: BuyOffer | null; // cheapest available price + buy link
};

export type VisualizeResult = {
  query: string;
  items: RetrievedItem[];
  /** Generated room image as a data URL (data:image/...). */
  image: string | null;
};
