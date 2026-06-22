import type { StyleScore } from "./service";

/** Strip internal fields from the score response (currently passthrough). */
export function toPublicStyleScore(score: StyleScore) {
  return score;
}
