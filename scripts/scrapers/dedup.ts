import { prisma } from "@/shared/db";
import { embedText } from "@/shared/ai";
import type { NormalizedProduct } from "./types";

const DEDUP_THRESHOLD = 0.90;

/**
 * Build the same embedding text used by embed-refresh, so vectors are comparable.
 */
function buildText(p: NormalizedProduct): string {
  return [
    p.name,
    p.brand,
    `category=${p.category}`,
    p.description ?? "",
    `colors: ${p.colors.join(", ")}`,
    `style: ${p.styleTags.join(", ")}`,
  ]
    .filter(Boolean)
    .join(". ")
    .trim();
}

/**
 * Try to find an existing component matching this product via vector similarity.
 * Returns the existing component id if similarity > threshold, or null if no match.
 *
 * Only searches within the same category to avoid false positives.
 */
export async function findDuplicate(
  product: NormalizedProduct,
): Promise<string | null> {
  const text = buildText(product);
  const vec = await embedText(text);
  const vecLiteral = `[${vec.join(",")}]`;

  const rows = await prisma.$queryRawUnsafe<
    { id: string; similarity: number }[]
  >(
    `SELECT c.id, 1 - (c.embedding <=> $1::vector) AS similarity
     FROM components c
     WHERE c."isActive" = true
       AND c.embedding IS NOT NULL
       AND c.category = $2
     ORDER BY c.embedding <=> $1::vector
     LIMIT 1`,
    vecLiteral,
    product.category,
  );

  if (rows.length > 0 && Number(rows[0].similarity) >= DEDUP_THRESHOLD) {
    return rows[0].id;
  }

  return null;
}
