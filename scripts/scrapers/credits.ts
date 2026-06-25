/**
 * Firecrawl credit tracking.
 * Search = 1 credit, Scrape = ~5 credits (varies by page complexity).
 * Free tier: ~1000 credits/month.
 */

let searchCount = 0;
let scrapeCount = 0;

export function recordSearch(count = 1) {
  searchCount += count;
}

export function recordScrape(count = 1) {
  scrapeCount += count;
}

export function getCreditsUsed(): { search: number; scrape: number; total: number } {
  return {
    search: searchCount,
    scrape: scrapeCount,
    total: searchCount + scrapeCount * 5, // estimate: 1 per search, 5 per scrape
  };
}

export function resetCredits() {
  searchCount = 0;
  scrapeCount = 0;
}
