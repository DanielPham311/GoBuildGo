/** API-safe shapes for search results. Reference: docs/RAG_VISUALIZATION.md §4. */

export type SearchOffer = {
  shop: string;
  price: number; // VND
  url: string;
};

export type SearchResultItem = {
  id: string;
  category: string;
  brand: string;
  name: string;
  description: string | null;
  colors: string[];
  styleTags: string[];
  imageUrl: string | null;
  specs: unknown;
  dimensions: unknown;
  similarity: number; // 0..1 cosine similarity
  offer: SearchOffer | null; // cheapest available price + buy link
};

export type SearchResult = {
  query: string;
  items: SearchResultItem[];
};
