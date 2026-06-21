// Voyage AI client — embeddings via Voyage API.
// Model: voyage-4 (1024-dim, 32K context). 200M free tokens/month.
// https://docs.voyageai.com/docs/embeddings
// Image generation is handled by Pollinations.ai (see image-gen.ts).
// Reference: docs/RAG_VISUALIZATION.md §2.

import { aiRateLimiter } from "./rate-limit";

const API = "https://api.voyageai.com/v1";
const EMBED_MODEL = "voyage-4"; // 1024-dim, 200M free tokens/month

function apiKey(): string {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error("VOYAGE_API_KEY is not set");
  return key;
}

/** Embed a single text into a 1024-dim vector via Voyage AI. */
export async function embedText(text: string): Promise<number[]> {
  await aiRateLimiter.acquire();
  const res = await fetch(`${API}/embeddings`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  if (!res.ok) throw new Error(`Voyage embed failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { data?: { embedding: number[] }[] };
  if (!json.data?.[0]?.embedding) throw new Error("Voyage embed: no vector in response");
  return json.data[0].embedding;
}
