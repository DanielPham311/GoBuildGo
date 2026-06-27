"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, AlertCircle, RefreshCw, Image as ImageIcon } from "lucide-react";

type PromptLog = {
  id: string;
  type: string;
  prompt: string;
  resultCount: number;
  itemIds: string[];
  imageUrl: string | null;
  user: { id: string; name: string | null; email: string | null } | null;
  createdAt: string;
};

type ListResponse = {
  data: PromptLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const TYPES = ["", "search", "visualize"] as const;

export default function AdminPromptsPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<string>("");
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (type) params.set("type", type);
      const res = await fetch(`/api/v1/admin/prompts?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Failed to load prompts");
      setData(json as ListResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [page, type]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-primary" />
            User Prompts
          </h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.total.toLocaleString()} prompts logged` : "Search & visualize observability"}
          </p>
        </div>
        <div className="flex gap-1.5 rounded-xl border border-border/40 bg-card p-1">
          {TYPES.map((t) => (
            <button
              key={t || "all"}
              onClick={() => {
                setPage(1);
                setType(t);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                type === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {t || "all"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-500">
          <AlertCircle className="h-5 w-5" /> {error}
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-muted-foreground">
          <RefreshCw className="mx-auto h-5 w-5 animate-spin" />
        </div>
      ) : data && data.data.length > 0 ? (
        <div className="space-y-3">
          {data.data.map((log) => (
            <div key={log.id} className="rounded-2xl border border-border/40 bg-card/45 p-4 shadow-sm backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span
                  className={`rounded-md px-2 py-0.5 uppercase tracking-wider ${
                    log.type === "visualize"
                      ? "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400"
                      : "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                  }`}
                >
                  {log.type}
                </span>
                <span>{log.user?.name ?? log.user?.email ?? "Guest"}</span>
                <span>·</span>
                <span>{new Date(log.createdAt).toLocaleString("vi-VN")}</span>
                <span>·</span>
                <span>{log.resultCount} results</span>
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">{log.prompt}</p>
              {log.imageUrl && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ImageIcon className="h-3.5 w-3.5" />
                  <a href={log.imageUrl} target="_blank" rel="noreferrer" className="underline hover:text-foreground">
                    View generated image
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border/40 bg-card/45 p-10 text-center text-muted-foreground">
          No prompts logged yet.
        </div>
      )}

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
