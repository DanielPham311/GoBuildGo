/**
 * Firecrawl API v1 client — search + scrape endpoints.
 * Docs: https://docs.firecrawl.dev/api-reference/introduction
 */

import { config } from "dotenv";
config({ path: ".env" });

const FIRECRAWL_API = "https://api.firecrawl.dev/v1";

function getApiKey(): string {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("FIRECRAWL_API_KEY is not set");
  return key;
}

export type FirecrawlSearchResult = {
  url: string;
  title: string;
  description: string;
  position: number;
};

export type FirecrawlSearchResponse = {
  success: boolean;
  data: FirecrawlSearchResult[];
};

export type FirecrawlScrapeResponse = {
  success: boolean;
  data: {
    markdown: string;
    metadata: {
      title: string;
      description: string;
      ogImage: string | null;
      sourceURL: string;
    };
  };
};

/** Search Firecrawl for a query. Returns top results. */
export async function firecrawlSearch(
  query: string,
  limit = 10,
): Promise<FirecrawlSearchResult[]> {
  const res = await fetch(`${FIRECRAWL_API}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      query,
      limit,
    }),
  });

  if (!res.ok) {
    throw new Error(`Firecrawl search failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as FirecrawlSearchResponse;
  return json.data ?? [];
}

/** Scrape a single URL and return markdown content. */
export async function firecrawlScrape(url: string): Promise<{
  markdown: string;
  title: string;
  description: string;
  ogImage: string | null;
}> {
  const res = await fetch(`${FIRECRAWL_API}/scrape`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
    }),
  });

  if (!res.ok) {
    throw new Error(`Firecrawl scrape failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as FirecrawlScrapeResponse;
  return {
    markdown: json.data.markdown,
    title: json.data.metadata.title,
    description: json.data.metadata.description,
    ogImage: json.data.metadata.ogImage ?? null,
  };
}
