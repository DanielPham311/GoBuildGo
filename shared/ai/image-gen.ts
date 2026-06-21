// Pollinations.ai client — free image generation, no signup or API key required.
// Anonymous tier: 1 req / 15s. Register to remove watermarks + 1 req / 5s.
// https://image.pollinations.ai/prompt/{prompt}
// Reference: docs/RAG_VISUALIZATION.md §2.

import { aiRateLimiter } from "./rate-limit";

const API = "https://image.pollinations.ai/prompt";
const DEFAULT_MODEL = "flux";

/** An image input for compositing (base64-encoded). */
export type ImageInput = { mimeType: string; dataBase64: string };

/** Encode a prompt for safe use in a URL path. */
function encodePrompt(prompt: string): string {
  return encodeURIComponent(prompt.replace(/\n/g, " ").slice(0, 1800));
}

/**
 * Generate a room visualization via Pollinations.ai (FLUX model).
 * Returns a PNG/JPEG data URL (image is fetched, then converted to base64 for caching).
 * `refs` are optional reference images (not supported by Pollinations).
 */
export async function generateRoomImage(
  prompt: string,
  _refs: ImageInput[] = [],
): Promise<string> {
  await aiRateLimiter.acquire();

  const url = `${API}/${encodePrompt(prompt)}?width=1024&height=1024&model=${DEFAULT_MODEL}&nologo=true`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pollinations image failed: ${res.status} ${await res.text()}`);

  // Pollinations returns the image directly as binary — convert to base64 data URL for caching.
  const blob = await res.blob();
  const buffer = Buffer.from(await blob.arrayBuffer());
  const base64 = buffer.toString("base64");
  const mime = blob.type || "image/jpeg";
  return `data:${mime};base64,${base64}`;
}
