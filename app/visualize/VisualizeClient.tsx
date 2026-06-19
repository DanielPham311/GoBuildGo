"use client";

import { useState } from "react";
import type { VisualizeResult } from "@/modules/visualize";

const ROOM_TYPES = ["", "bedroom", "gaming_room", "office", "studio"] as const;

export default function VisualizeClient() {
  const [query, setQuery] = useState("");
  const [roomType, setRoomType] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VisualizeResult | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/v1/visualize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query,
          ...(roomType ? { roomType } : {}),
          ...(maxPrice ? { maxPrice: Number(maxPrice) } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Request failed");
      setResult(json as VisualizeResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border p-6">
        <div className="space-y-2">
          <label htmlFor="query" className="text-sm font-medium">
            Describe your dream setup
          </label>
          <textarea
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="cozy warm-light gaming corner with a wooden desk and plants"
            rows={3}
            required
            minLength={3}
            className="w-full rounded-md border bg-background p-3 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="space-y-1">
            <label htmlFor="room" className="text-xs font-medium text-muted-foreground">
              Room type
            </label>
            <select
              id="room"
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className="rounded-md border bg-background p-2 text-sm"
            >
              {ROOM_TYPES.map((r) => (
                <option key={r || "any"} value={r}>
                  {r ? r.replace("_", " ") : "Any"}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="price" className="text-xs font-medium text-muted-foreground">
              Max price / item (VND)
            </label>
            <input
              id="price"
              type="number"
              min={0}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="e.g. 5000000"
              className="rounded-md border bg-background p-2 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || query.trim().length < 3}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? "Visualizing…" : "Visualize my room"}
        </button>
      </form>

      {error && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-6">
          {result.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={result.image}
              alt="Generated room visualization"
              className="w-full rounded-lg border"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No matching items found to visualize. Try a different query.
            </p>
          )}

          {result.items.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold">Items in this look</h2>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {result.items.map((item) => (
                  <li key={item.id} className="flex gap-3 rounded-md border p-3">
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-16 w-16 rounded object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.brand} · {item.category} · match{" "}
                        {(item.similarity * 100).toFixed(0)}%
                      </p>
                      {item.offer ? (
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">
                            {item.offer.price.toLocaleString("vi-VN")}₫
                          </span>
                          <a
                            href={item.offer.url}
                            target="_blank"
                            rel="noopener noreferrer nofollow sponsored"
                            className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
                          >
                            Buy on {item.offer.shop}
                          </a>
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">No price available</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
