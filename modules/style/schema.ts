import { z } from "zod";

/** GET /api/v1/setups/[id]/score — query params (none needed, id is in URL). */
export const scoreSetupSchema = z.object({
  // Reserved for future options (e.g., ?weights=color:30,theme:30,space:20,budget:20)
});

export type ScoreSetupQuery = z.infer<typeof scoreSetupSchema>;
