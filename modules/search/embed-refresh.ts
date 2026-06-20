import { prisma } from "@/shared/db";
import { embedBatch } from "@/shared/ai/embed-batch";

/**
 * Build the text to embed for a component.
 * Concatenates all searchable fields into a single string.
 * Reference: docs/RAG_VISUALIZATION.md §4.
 */
function buildEmbeddingText(c: {
  name: string;
  brand: string;
  category: string;
  description: string | null;
  colors: string[];
  styleTags: string[];
  specs: unknown;
}): string {
  const specsStr =
    typeof c.specs === "object" && c.specs !== null
      ? Object.entries(c.specs as Record<string, unknown>)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ")
      : "";

  return [
    c.name,
    c.brand,
    `category=${c.category}`,
    c.description ?? "",
    `colors: ${c.colors.join(", ")}`,
    `style: ${c.styleTags.join(", ")}`,
    `specs: ${specsStr}`,
  ]
    .filter(Boolean)
    .join(". ")
    .trim();
}

/**
 * Refresh embeddings for all components where embeddingStale = true.
 * Rate-limited via embedBatch(). Idempotent — re-runs skip already-embedded items.
 */
export async function refreshEmbeddings(): Promise<{ processed: number; failed: number }> {
  const stale = await prisma.component.findMany({
    where: { embeddingStale: true, isActive: true },
    select: {
      id: true,
      name: true,
      brand: true,
      category: true,
      description: true,
      colors: true,
      styleTags: true,
      specs: true,
    },
  });

  if (stale.length === 0) {
    console.log("[embed-refresh] No stale embeddings to refresh.");
    return { processed: 0, failed: 0 };
  }

  console.log(`[embed-refresh] Embedding ${stale.length} stale components…`);

  const items = stale.map((c) => ({ id: c.id, text: buildEmbeddingText(c) }));
  const embeddings = await embedBatch(items, (done, total) => {
    console.log(`[embed-refresh] ${done}/${total}`);
  });

  let failed = 0;
  for (const [id, vec] of embeddings) {
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE components SET embedding = $1::vector, embedding_stale = false WHERE id = $2`,
        `[${vec.join(",")}]`,
        id,
      );
    } catch {
      failed++;
    }
  }

  console.log(`[embed-refresh] Done. ${embeddings.size} embedded, ${failed} failed.`);
  return { processed: embeddings.size, failed };
}
