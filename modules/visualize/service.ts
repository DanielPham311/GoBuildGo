import { prisma } from "@/shared/db";
import { embedText, generateRoomImage } from "@/shared/ai";
import crypto from "node:crypto";
import { buildAffiliateUrl } from "@/modules/affiliate";
import type { VisualizeRequest } from "./schema";
import type { RetrievedItem, VisualizeResult } from "./public";

// RAG retrieval + image generation. Reference: docs/RAG_VISUALIZATION.md §4–5.

/**
 * Build a deterministic hash of the render inputs so identical requests
 * return the cached image without hitting the AI API.
 */
function promptHash(req: VisualizeRequest, itemIds: string[]): string {
  const payload = JSON.stringify({
    q: req.query,
    room: req.roomType ?? null,
    items: itemIds.sort(),
  });
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

/**
 * Vector search over components using pgvector cosine distance (`<=>`).
 * Requires the `embedding vector(1024)` column + HNSW index.
 */
async function searchSimilar(queryVec: number[], req: VisualizeRequest): Promise<RetrievedItem[]> {
  const vecLiteral = `[${queryVec.join(",")}]`;

  // Build WHERE filters alongside the vector search so budget/room are hard constraints.
  const conditions: string[] = ['c."isActive" = true', "c.embedding IS NOT NULL"];
  const params: unknown[] = [vecLiteral];

  if (req.maxPrice) {
    params.push(req.maxPrice);
    conditions.push(`EXISTS (
      SELECT 1 FROM prices p
      WHERE p."componentId" = c.id AND p."isAvailable" = true AND p.price <= $${params.length}
    )`);
  }

  params.push(req.topK);
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
      similarity: number;
    }[]
  >(
    `SELECT c.id, c.category, c.brand, c.name, c.description,
            c.colors, c."styleTags", c."imageUrl",
            1 - (c.embedding <=> $1::vector) AS similarity
     FROM components c
     WHERE ${conditions.join(" AND ")}
     ORDER BY c.embedding <=> $1::vector
     LIMIT $${limitIdx}`,
    ...params,
  );

  const items = rows.map((r) => ({
    id: r.id,
    category: r.category,
    brand: r.brand,
    name: r.name,
    description: r.description,
    colors: r.colors,
    styleTags: r.styleTags,
    imageUrl: r.imageUrl,
    similarity: Number(r.similarity),
    offer: null as RetrievedItem["offer"],
  }));

  await attachOffers(items);
  return items;
}

/** Attach the cheapest available price + buy link to each retrieved item. */
async function attachOffers(items: RetrievedItem[]): Promise<void> {
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
    const offer = cheapest.get(item.id);
    if (offer) {
      item.offer = {
        shop: offer.shop,
        price: offer.price,
        url: offer.url,
        affiliateUrl: buildAffiliateUrl(offer.url, item.id),
      };
    } else {
      item.offer = null;
    }
  }
}

/** Build the image-gen prompt from retrieved items + the user's intent. */
function buildPrompt(req: VisualizeRequest, items: RetrievedItem[]): string {
  const room = req.roomType ? req.roomType.replace("_", " ") : "room";
  const lines = items.map(
    (i) => `- ${i.name} (${i.category}${i.colors.length ? `, ${i.colors.join("/")}` : ""})`,
  );
  return [
    `Generate a photorealistic interior visualization of a ${room} that includes these items, arranged tastefully:`,
    ...lines,
    `User's vision: "${req.query}".`,
    `Cohesive lighting and styling. No text or watermarks.`,
  ].join("\n");
}

/** Full flow: embed query → vector search → check cache → generate or return cached image. */
export async function visualize(req: VisualizeRequest, userId?: string): Promise<VisualizeResult> {
  const queryVec = await embedText(req.query);
  const items = await searchSimilar(queryVec, req);

  let image: string | null = null;

  if (items.length > 0) {
    const itemIds = items.map((i) => i.id);
    const hash = promptHash(req, itemIds);

    // Check cache first
    const cached = await prisma.generatedRender.findUnique({
      where: { promptHash: hash },
      select: { imageUrl: true },
    });

    if (cached) {
      image = cached.imageUrl;
    } else {
      image = await generateRoomImage(buildPrompt(req, items));
      // Cache the result (fire-and-forget — non-critical)
      prisma.generatedRender
        .create({
          data: {
            promptHash: hash,
            imageUrl: image,
            itemIds,
            roomType: req.roomType ?? null,
          },
        })
        .catch(() => {
          // ignore cache write failures
        });
    }
  }

  // Observability log (fire-and-forget — non-critical).
  prisma.promptLog
    .create({
      data: {
        type: "visualize",
        prompt: req.query,
        userId: userId ?? null,
        resultCount: items.length,
        itemIds: items.map((i) => i.id),
        imageUrl: image,
      },
    })
    .catch(() => {});

  return { query: req.query, items, image };
}
