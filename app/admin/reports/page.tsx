"use client";

import { useState, useEffect } from "react";
import { MousePointerClick, AlertCircle, RefreshCw } from "lucide-react";

type ReportRow = {
  componentId: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string | null;
  clicks: number;
  byShop: Record<string, number>;
};

type ReportData = { totalClicks: number; rows: ReportRow[] };

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/v1/admin/reports/clicks")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message ?? "Failed to load report");
        return json as ReportData;
      })
      .then((json) => active && setData(json))
      .catch((err) => active && setError(err instanceof Error ? err.message : "Unknown error"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <MousePointerClick className="h-7 w-7 text-primary" />
          Affiliate Click Report
        </h1>
        <p className="text-sm text-muted-foreground">
          {data ? `${data.totalClicks.toLocaleString()} total clicks tracked` : "Most-clicked products"}
        </p>
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
                {["#", "Product", "Category", "Total Clicks", "By Shop"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : data && data.rows.length > 0 ? (
                data.rows.map((row, i) => (
                  <tr key={row.componentId} className="hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3 font-bold text-muted-foreground">{i + 1}</td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-foreground">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.brand}</p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{row.category}</td>
                    <td className="px-5 py-3 font-extrabold text-primary">{row.clicks.toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(row.byShop).map(([shop, n]) => (
                          <span key={shop} className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                            {shop}: {n}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                    No clicks recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
