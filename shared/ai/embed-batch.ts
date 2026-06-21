import { embedText } from "./openrouter";
import { aiRateLimiter } from "./rate-limit";

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 2000;

/** Sleep helper. */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Embed multiple texts sequentially with rate limiting and retry.
 * Returns a Map of input id → embedding vector.
 * Failed items are skipped (logged but not thrown).
 */
export async function embedBatch(
  items: { id: string; text: string }[],
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, number[]>> {
  const results = new Map<string, number[]>();

  for (let i = 0; i < items.length; i++) {
    const { id, text } = items[i];
    let lastErr: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await aiRateLimiter.acquire();
        const vec = await embedText(text);
        results.set(id, vec);
        break;
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        if (attempt < MAX_RETRIES - 1) {
          await sleep(RETRY_BASE_MS * (attempt + 1));
        }
      }
    }

    if (lastErr && !results.has(id)) {
      console.error(`[embedBatch] Failed for ${id} after ${MAX_RETRIES} attempts: ${lastErr.message}`);
    }

    onProgress?.(i + 1, items.length);
  }

  return results;
}
