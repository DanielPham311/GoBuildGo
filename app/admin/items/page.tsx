"use client";

import { useState, useEffect, useCallback } from "react";
import { Package, Search, Trash2, RefreshCw, AlertCircle } from "lucide-react";

type AdminComponent = {
  id: string;
  category: string;
  brand: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  isActive: boolean;
  embeddingStale: boolean;
  priceCount: number;
  createdAt: string;
};

type ListResponse = {
  data: AdminComponent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export default function AdminItemsPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "24" });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/v1/admin/components?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Failed to load items");
      setData(json as ListResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function toggleActive(item: AdminComponent) {
    setBusyId(item.id);
    try {
      await fetch(`/api/v1/admin/components/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      await fetchItems();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(item: AdminComponent) {
    if (!confirm(`Xóa "${item.name}"? Thao tác này không thể hoàn tác.`)) return;
    setBusyId(item.id);
    try {
      await fetch(`/api/v1/admin/components/${item.id}`, { method: "DELETE" });
      await fetchItems();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Package className="h-7 w-7 text-primary" />
            All Items
          </h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.total.toLocaleString()} components in catalog` : "Catalog inventory"}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search by name…"
            className="rounded-xl border border-border/40 bg-card py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-500">
          <AlertCircle className="h-5 w-5" /> {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/45 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border/40 bg-muted/40">
              <tr>
                {["Name", "Brand", "Category", "Prices", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : data && data.data.length > 0 ? (
                data.data.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3 font-semibold text-foreground">{item.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{item.brand}</td>
                    <td className="px-5 py-3 text-muted-foreground">{item.category}</td>
                    <td className="px-5 py-3 text-muted-foreground">{item.priceCount}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                          item.isActive
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {item.isActive ? "active" : "inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleActive(item)}
                          disabled={busyId === item.id}
                          className="rounded-lg border border-border/40 px-3 py-1 text-xs font-semibold hover:bg-muted disabled:opacity-50"
                        >
                          {item.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => remove(item)}
                          disabled={busyId === item.id}
                          className="rounded-lg border border-rose-500/30 p-1.5 text-rose-500 hover:bg-rose-500/10 disabled:opacity-50"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    No components found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-border/40 px-3 py-1.5 font-semibold hover:bg-muted disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-muted-foreground">
            Page {data.page} / {data.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages}
            className="rounded-lg border border-border/40 px-3 py-1.5 font-semibold hover:bg-muted disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
