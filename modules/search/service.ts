import { prisma } from "@/shared/db";
import { embedText } from "@/shared/ai";
import { COMPONENT_CATEGORIES } from "@/lib/constants";
import type { SearchQuery } from "./schema";
import type { SearchResultItem } from "./public";

/**
 * Vector similarity search over components using pgvector cosine distance.
 * Requires the `embedding vector(1024)` column + HNSW index.
 * Reference: docs/RAG_VISUALIZATION.md §4.
 */
async function searchSimilar(queryVec: number[], query: SearchQuery): Promise<SearchResultItem[]> {
  const vecLiteral = `[${queryVec.join(",")}]`;

  // Build WHERE filters alongside the vector search so budget/category are hard constraints.
  const conditions: string[] = ['c."isActive" = true', "c.embedding IS NOT NULL"];
  const params: unknown[] = [vecLiteral];

  if (query.category) {
    params.push(query.category);
    conditions.push(`c.category = $${params.length}`);
  }

  if (query.maxPrice) {
    params.push(query.maxPrice);
    conditions.push(`EXISTS (
      SELECT 1 FROM prices p
      WHERE p."componentId" = c.id AND p."isAvailable" = true AND p.price <= $${params.length}
    )`);
  }

  // Fetch more than topK so we have room to diversify across categories.
  params.push(query.topK * 3);
  const limitIdx = params.length;

  const rows = await prisma.$queryRawUnsafe<
    {
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
      similarity: number;
    }[]
  >(
    `SELECT c.id, c.category, c.brand, c.name, c.description,
            c.colors, c."styleTags", c."imageUrl", c.specs, c.dimensions,
            1 - (c.embedding <=> $1::vector) AS similarity
     FROM components c
     WHERE ${conditions.join(" AND ")}
     ORDER BY c.embedding <=> $1::vector
     LIMIT $${limitIdx}`,
    ...params,
  );

  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    brand: r.brand,
    name: r.name,
    description: r.description,
    colors: r.colors,
    styleTags: r.styleTags,
    imageUrl: r.imageUrl,
    specs: r.specs,
    dimensions: r.dimensions,
    similarity: Number(r.similarity),
    offer: null,
  }));
}

/**
 * Diversify results across categories.
 * Ensures each category is represented by its best match, then fills remaining slots
 * by similarity. Prevents "5 mice, no desk" problem.
 *
 * Algorithm:
 * 1. Pick the best item per category (round-robin by similarity)
 * 2. Fill remaining slots with whatever's most similar
 */
function diversify(items: SearchResultItem[], topK: number): SearchResultItem[] {
  if (items.length <= topK) return items;

  const picked: SearchResultItem[] = [];
  const pickedIds = new Set<string>();
  const byCategory = new Map<string, SearchResultItem[]>();

  // Group by category
  for (const item of items) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }

  // Round-robin: pick best from each category
  let changed = true;
  while (picked.length < topK && changed) {
    changed = false;
    for (const category of COMPONENT_CATEGORIES) {
      if (picked.length >= topK) break;
      const list = byCategory.get(category);
      if (!list) continue;
      const next = list.find((i) => !pickedIds.has(i.id));
      if (next) {
        picked.push(next);
        pickedIds.add(next.id);
        changed = true;
      }
    }
  }

  // Fill remaining slots by similarity
  for (const item of items) {
    if (picked.length >= topK) break;
    if (!pickedIds.has(item.id)) {
      picked.push(item);
      pickedIds.add(item.id);
    }
  }

  return picked;
}

/** Attach the cheapest available price + buy link to each result item. */
async function attachOffers(items: SearchResultItem[]): Promise<void> {
  if (items.length === 0) return;

  const prices = await prisma.price.findMany({
    where: { componentId: { in: items.map((i) => i.id) }, isAvailable: true },
    orderBy: { price: "asc" },
    select: { componentId: true, shop: true, price: true, url: true },
  });

  // findMany returns ascending by price → first seen per component is cheapest.
  const cheapest = new Map<string, { shop: string; price: number; url: string }>();
  for (const p of prices) {
    if (!cheapest.has(p.componentId)) {
      cheapest.set(p.componentId, { shop: p.shop, price: Number(p.price), url: p.url });
    }
  }

  for (const item of items) {
    item.offer = cheapest.get(item.id) ?? null;
  }
}

/** Full RAG retrieval flow: embed query → vector search → diversify → attach offers. */
export async function searchComponents(query: SearchQuery) {
  const queryVec = await embedText(query.q);
  const rawItems = await searchSimilar(queryVec, query);
  const items = diversify(rawItems, query.topK);
  await attachOffers(items);
  return { query: query.q, items };
}
