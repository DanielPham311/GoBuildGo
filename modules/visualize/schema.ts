import { z } from "zod";

// Request schema for POST /api/v1/visualize. Reference: docs/RAG_VISUALIZATION.md §4–5.
export const visualizeRequestSchema = z.object({
  query: z.string().min(3).max(500),
  roomType: z.enum(["bedroom", "gaming_room", "office", "studio"]).optional(),
  maxPrice: z.coerce.number().int().positive().optional(), // VND cap (per item)
  topK: z.coerce.number().int().min(1).max(12).default(6),
});

export type VisualizeRequest = z.infer<typeof visualizeRequestSchema>;
