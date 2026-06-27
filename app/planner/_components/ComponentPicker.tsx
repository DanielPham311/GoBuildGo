"use client";

import { useState, useEffect, useCallback } from "react";
import { useSetupStore } from "@/store/setup";
import { COMPONENT_CATEGORIES } from "@/lib/constants";
import type { PublicComponent } from "@/modules/components";
import { formatCurrency } from "@/lib/utils";

interface Props {
  category: string | null; // null = "all"
  onClose: () => void;
}

export function ComponentPicker({ category, onClose }: Props) {
  const { items: setupItems, addItem } = useSetupStore();
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>(category ?? COMPONENT_CATEGORIES[0]);
  const [results, setResults] = useState<PublicComponent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComponents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("q", search || activeCat);
      params.set("category", activeCat);
      params.set("topK", "24");
      const res = await fetch(`/api/v1/search?${params}`);
      if (res.ok) {
        const json = await res.json();
        setResults(json.items ?? []);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [search, activeCat]);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  const addedIds = new Set(setupItems.map((i) => i.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative flex h-[80vh] w-[700px] flex-col rounded-xl border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Add Component</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 hover:bg-muted"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="border-b px-4 py-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search components..."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            autoFocus
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 overflow-x-auto border-b px-4 py-2">
          {COMPONENT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeCat === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {cat.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Results grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              No components found. Try a different search.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {results.map((comp) => {
                const isAdded = addedIds.has(comp.id);
                return (
                  <div
                    key={comp.id}
                    className="group relative flex flex-col rounded-lg border bg-background p-3 transition-shadow hover:shadow-md"
                  >
                    {/* Image */}
                    <div className="mb-2 aspect-[4/3] overflow-hidden rounded-md bg-muted">
                      {comp.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={comp.imageUrl}
                          alt={comp.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-2xl text-muted-foreground">
                          📦
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <p className="text-xs text-muted-foreground">{comp.brand}</p>
                    <p className="line-clamp-2 text-sm font-medium">{comp.name}</p>

                    {/* Style tags */}
                    {comp.styleTags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {comp.styleTags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-muted px-1.5 py-0.5 text-[10px]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Add button */}
                    <button
                      onClick={() => {
                        if (!isAdded) addItem(comp);
                      }}
                      disabled={isAdded}
                      className={`mt-2 w-full rounded-md py-1.5 text-xs font-medium transition-colors ${
                        isAdded
                          ? "bg-muted text-muted-foreground cursor-default"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                    >
                      {isAdded ? "Added" : "+ Add"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
