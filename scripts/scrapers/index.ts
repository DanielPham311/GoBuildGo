import type { Scraper } from "./types";
import { firecrawlCrawler } from "./firecrawl";
import { shopeeScraper } from "./shopee";

/**
 * Scraper registry — Firecrawl is the primary multi-shop crawler.
 * Shopee is kept as a fallback but Firecrawl should handle all shops.
 */
const scrapers: Map<string, Scraper> = new Map();
scrapers.set("firecrawl", firecrawlCrawler);
scrapers.set("shopee", shopeeScraper); // fallback

export function getScraper(name: string): Scraper | undefined {
  return scrapers.get(name);
}

export function getAllScrapers(): Scraper[] {
  return Array.from(scrapers.values());
}

export { firecrawlCrawler, shopeeScraper };
