// Gemini client — embeddings + image generation via REST (no SDK dep).
// Reference: docs/RAG_VISUALIZATION.md §2.

import { geminiRateLimiter } from "./rate-limit";

const API = "https://generativelanguage.googleapis.com/v1beta";
const EMBED_MODEL = "text-embedding-004"; // 768-dim
const IMAGE_MODEL = "gemini-2.5-flash-image"; // "Nano Banana"

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return key;
}

/** Embed a single text into a 768-dim vector. */
export async function embedText(text: string): Promise<number[]> {
  await geminiRateLimiter.acquire();
  const res = await fetch(`${API}/models/${EMBED_MODEL}:embedContent?key=${apiKey()}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text }] },
    }),
  });
  if (!res.ok) throw new Error(`Gemini embed failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { embedding?: { values: number[] } };
  if (!json.embedding?.values) throw new Error("Gemini embed: no vector in response");
  return json.embedding.values;
}

/** An image input for compositing (base64-encoded). */
export type ImageInput = { mimeType: string; dataBase64: string };

/**
 * Generate a room visualization. Returns a base64 PNG/JPEG data URL.
 * `productImages` and `roomPhoto` are optional reference images to composite.
 */
export async function generateRoomImage(
  prompt: string,
  refs: ImageInput[] = [],
): Promise<string> {
  await geminiRateLimiter.acquire();
  const parts: unknown[] = [
    { text: prompt },
    ...refs.map((r) => ({ inline_data: { mime_type: r.mimeType, data: r.dataBase64 } })),
  ];

  const res = await fetch(`${API}/models/${IMAGE_MODEL}:generateContent?key=${apiKey()}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }] }),
  });
  if (!res.ok) throw new Error(`Gemini image failed: ${res.status} ${await res.text()}`);

  const json = (await res.json()) as {
    candidates?: { content: { parts: { inlineData?: { mimeType: string; data: string } }[] } }[];
  };
  const img = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
  if (!img) throw new Error("Gemini image: no image in response");
  return `data:${img.mimeType};base64,${img.data}`;
}
