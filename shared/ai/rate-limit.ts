/**
 * Token-bucket rate limiter for Gemini API calls.
 * Stays safely under the free-tier 60 req/min cap.
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms

  constructor(perMinute: number) {
    this.maxTokens = perMinute;
    this.tokens = perMinute;
    this.refillRate = perMinute / 60000;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    const waitMs = Math.ceil((1 - this.tokens) / this.refillRate);
    await new Promise((r) => setTimeout(r, waitMs));
    this.refill();
    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

// Shared limiter: 50 req/min to stay safely under Gemini free tier (60/min).
export const geminiRateLimiter = new RateLimiter(50);
