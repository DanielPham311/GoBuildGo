"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Heart, Trash2, ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Favorite = {
  id: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string | null;
  lowestPrice: number | null;
  favoritedAt: string;
};

export default function FavoritesPage() {
  const [items, setItems] = useState<Favorite[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const limit = 20;

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/users/me/favorites?page=${page}&limit=${limit}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error.message);
        return;
      }
      setItems(data.data);
      setTotal(data.total);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  async function removeFavorite(componentId: string) {
    try {
      await fetch(`/api/v1/users/me/favorites/${componentId}`, { method: "DELETE" });
      loadFavorites();
    } catch {
      // silent
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Heart className="h-5 w-5 text-rose-500" />
        Favorites
        <span className="text-sm font-normal text-muted-foreground">({total})</span>
      </h2>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 text-center">
          <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No favorites yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse components and click the heart icon to save them.
          </p>
          <Link
            href="/planner"
            className="mt-4 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            Browse Components
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md"
              >
                <div className="h-14 w-14 shrink-0 rounded-lg bg-muted overflow-hidden">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl opacity-50">
                      🖥️
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-sm truncate">{item.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {item.brand} &middot; {item.category}
                  </p>
                  {item.lowestPrice != null && (
                    <p className="mt-1 text-sm font-bold text-primary">
                      {formatCurrency(item.lowestPrice)}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => removeFavorite(item.id)}
                  className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  title="Remove from favorites"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {page > 1 && (
                <button
                  onClick={() => setPage(page - 1)}
                  className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Previous
                </button>
              )}
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <button
                  onClick={() => setPage(page + 1)}
                  className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Next
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
