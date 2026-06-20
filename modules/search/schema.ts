import { z } from "zod";
import { COMPONENT_CATEGORIES } from "@/lib/constants";

/** Query params for GET /api/v1/search (RAG_VISUALIZATION.md §4). */
export const searchQuerySchema = z.object({
  q: z.string().min(2).max(500),
  category: z.enum(COMPONENT_CATEGORIES).optional(),
  maxPrice: z.coerce.number().int().positive().optional(),
  topK: z.coerce.number().int().min(1).max(20).default(8),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
