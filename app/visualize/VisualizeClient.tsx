"use client";

import { useState } from "react";
import type { VisualizeResult } from "@/modules/visualize";
import { Sparkles, DollarSign, ExternalLink, AlertCircle, Wand2, Layers } from "lucide-react";

const ROOM_TYPES = ["", "bedroom", "gaming_room", "office", "studio"] as const;

const SHOP_COLOR: Record<string, string> = {
  shopee: "bg-[#FF5722]/10 text-[#FF5722]",
  lazada: "bg-[#000080]/10 text-[#000080]",
  tiki: "bg-[#1890FF]/10 text-[#1890FF]",
  phongvu: "bg-[#0052CC]/10 text-[#0052CC]",
  gearvn: "bg-[#E60012]/10 text-[#E60012]",
  nhaxinh: "bg-[#5D4037]/10 text-[#5D4037]",
};

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
    <div className="mx-auto w-full max-w-4xl space-y-8 animate-in fade-in duration-500">
      <form onSubmit={onSubmit} className="space-y-6 rounded-2xl border border-border/40 bg-card/40 p-6 backdrop-blur-md shadow-md">
        <div className="space-y-2">
          <label htmlFor="query" className="text-sm font-semibold tracking-wide text-foreground flex items-center gap-1.5">
            <Wand2 className="h-4 w-4 text-primary" />
            Describe your dream setup
          </label>
          <textarea
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. cozy warm-light gaming corner with a walnut wood desk and plants"
            rows={3}
            required
            minLength={3}
            className="w-full rounded-xl border border-border bg-background/50 p-3.5 text-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 leading-relaxed"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="room" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Room Type
            </label>
            <select
              id="room"
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className="w-full rounded-xl border border-border bg-background/50 p-2.5 text-sm font-medium focus:border-primary focus:outline-none"
            >
              {ROOM_TYPES.map((r) => (
                <option key={r || "any"} value={r}>
                  {r ? r.replace("_", " ").toUpperCase() : "ANY TYPE"}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="price" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              Max Price / Item (VND)
            </label>
            <input
              id="price"
              type="number"
              min={0}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="e.g. 5000000"
              className="w-full rounded-xl border border-border bg-background/50 p-2.5 text-sm font-medium focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || query.trim().length < 3}
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all duration-300 hover:bg-primary/95 disabled:opacity-50 hover:scale-[1.01]"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              <span>Generating Layout...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-amber-300 transition-transform group-hover:scale-110" />
              <span>Visualize My Room</span>
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-500">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="grid gap-8 md:grid-cols-12 items-start animate-in slide-in-from-bottom-5 duration-500">
          {/* Generated Image Frame */}
          <div className="md:col-span-7 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="h-4 w-4" />
              Generated Concept
            </h2>
            {result.image ? (
              <div className="overflow-hidden rounded-2xl border border-border shadow-lg bg-card group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.image}
                  alt="Generated room visualization"
                  className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.01]"
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed p-10 text-center bg-card/30">
                <p className="text-sm text-muted-foreground">
                  No matching items found to visualize. Try adjusting description query.
                </p>
              </div>
            )}
          </div>

          {/* Extracted Items */}
          <div className="md:col-span-5 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Matching Items ({result.items.length})
            </h2>
            {result.items.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {result.items.map((item) => (
                  <div key={item.id} className="flex gap-3 rounded-xl border border-border/40 bg-card/30 p-3 hover:bg-card hover:shadow-sm transition-all duration-300">
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-16 w-16 rounded-lg object-cover border border-border/45"
                      />
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate text-xs font-bold text-foreground">{item.name}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          {item.brand}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-semibold">•</span>
                        <span className="text-[10px] text-primary font-bold">
                          {(item.similarity * 100).toFixed(0)}% match
                        </span>
                      </div>
                      {item.offer ? (
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/30 mt-1">
                          <span className="text-xs font-extrabold text-foreground">
                            {item.offer.price.toLocaleString("vi-VN")}₫
                          </span>
                          <a
                            href={item.offer.url}
                            target="_blank"
                            rel="noopener noreferrer nofollow sponsored"
                            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                          >
                            <span>Buy</span>
                            <span className={`px-1 rounded text-[8px] font-extrabold uppercase ${SHOP_COLOR[item.offer.shop.toLowerCase()] || "bg-muted text-muted-foreground"}`}>
                              {item.offer.shop}
                            </span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic">No price available</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No visual components linked.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

