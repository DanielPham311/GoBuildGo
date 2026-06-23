"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";

type Point = { price: number; at: string };
type Series = { shop: string; shopName: string | null; currentPrice: number; points: Point[] };
type HistoryResponse = { componentId: string; series: Series[] };

const SHOP_COLORS = ["#6366f1", "#f97316", "#10b981", "#ec4899", "#0ea5e9", "#eab308"];

/**
 * Per-shop price history line chart (F13). Self-contained SVG — no chart lib.
 * Fetches GET /api/v1/prices/history?component_id=…
 */
export function PriceHistoryChart({ componentId }: { componentId: string }) {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/v1/prices/history?component_id=${encodeURIComponent(componentId)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message ?? "Failed to load price history");
        return json as HistoryResponse;
      })
      .then((json) => active && setData(json))
      .catch((err) => active && setError(err instanceof Error ? err.message : "Unknown error"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [componentId]);

  const chart = useMemo(() => {
    if (!data) return null;
    const W = 600;
    const H = 220;
    const PAD = { top: 16, right: 16, bottom: 28, left: 64 };

    const allPoints = data.series.flatMap((s) => s.points);
    if (allPoints.length === 0) return null;

    const times = allPoints.map((p) => new Date(p.at).getTime());
    const prices = allPoints.map((p) => p.price);
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const spanT = maxT - minT || 1;
    const spanP = maxP - minP || 1;

    const x = (t: number) => PAD.left + ((t - minT) / spanT) * (W - PAD.left - PAD.right);
    const y = (p: number) => H - PAD.bottom - ((p - minP) / spanP) * (H - PAD.top - PAD.bottom);

    const lines = data.series.map((s, i) => {
      const pts = [...s.points].sort(
        (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
      );
      const d = pts
        .map((p, j) => `${j === 0 ? "M" : "L"} ${x(new Date(p.at).getTime()).toFixed(1)} ${y(p.price).toFixed(1)}`)
        .join(" ");
      return { shop: s.shop, color: SHOP_COLORS[i % SHOP_COLORS.length], d, pts };
    });

    return { W, H, x, y, minP, maxP, lines };
  }, [data]);

  if (loading) {
    return <div className="h-56 w-full animate-pulse rounded-2xl bg-muted/40 border border-border/30" />;
  }
  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-500">
        {error}
      </div>
    );
  }
  if (!chart) {
    return (
      <div className="rounded-xl border border-border/40 bg-card/45 p-6 text-sm text-muted-foreground">
        Chưa có lịch sử giá cho sản phẩm này.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border/40 bg-card/45 p-5 shadow-sm backdrop-blur-md">
      <h3 className="text-sm font-bold text-foreground">Lịch sử giá</h3>
      <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full" role="img" aria-label="Price history chart">
        {/* Y-axis labels: min & max */}
        <text x={8} y={chart.y(chart.maxP) + 4} className="fill-muted-foreground" fontSize={11}>
          {formatCurrency(chart.maxP)}
        </text>
        <text x={8} y={chart.y(chart.minP) + 4} className="fill-muted-foreground" fontSize={11}>
          {formatCurrency(chart.minP)}
        </text>
        {chart.lines.map((line) => (
          <g key={line.shop}>
            <path d={line.d} fill="none" stroke={line.color} strokeWidth={2} strokeLinejoin="round" />
            {line.pts.map((p, j) => (
              <circle
                key={j}
                cx={chart.x(new Date(p.at).getTime())}
                cy={chart.y(p.price)}
                r={2.5}
                fill={line.color}
              />
            ))}
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap gap-3">
        {chart.lines.map((line) => (
          <div key={line.shop} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: line.color }} />
            {line.shop}
          </div>
        ))}
      </div>
    </div>
  );
}
