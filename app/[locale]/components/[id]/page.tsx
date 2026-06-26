"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { ExternalLink, ArrowLeft } from "lucide-react";

type PriceHistoryPoint = { price: number; at: string };
type PriceSeries = {
  shop: string;
  shopName: string | null;
  currentPrice: number;
  points: PriceHistoryPoint[];
};
type HistoryResponse = { componentId: string; series: PriceSeries[] };
type PriceInfo = {
  shop: string;
  price: number;
  originalPrice: number;
  discount: number;
  affiliateUrl: string;
  inStock: boolean;
  lastUpdated: string;
};
type ComparisonResponse = {
  componentId: string;
  componentName: string;
  prices: PriceInfo[];
  lowestPrice: number | null;
  highestPrice: number | null;
};

const LINE_COLORS = ["#2563eb", "#dc2626", "#16a34a", "#f59e0b", "#9333ea", "#0891b2"];

export default function ComponentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const t = useTranslations("components");
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [compRes, histRes] = await Promise.all([
          fetch(`/api/v1/prices/compare?component_id=${id}`),
          fetch(`/api/v1/prices/history?component_id=${id}`),
        ]);
        if (cancelled) return;
        if (compRes.ok) setComparison(await compRes.json());
        if (histRes.ok) setHistory(await histRes.json());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-6 py-12">{t("common:loading")}</div>
      </main>
    );
  }

  if (!comparison) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <Link href="/components" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> {t("backToComponents")}
          </Link>
          <p className="py-8 text-center text-muted-foreground">{t("notFound")}</p>
        </div>
      </main>
    );
  }

  const shopKeys = history?.series.map((s) => s.shop) ?? [];
  const allDates = new Set<string>();
  history?.series.forEach((s) => s.points.forEach((p) => allDates.add(p.at)));
  const sortedDates = Array.from(allDates).sort((a, b) => (a < b ? -1 : 1));
  const chartData = sortedDates.map((at) => {
    const row: Record<string, string | number> = { date: new Date(at).toLocaleDateString() };
    history?.series.forEach((s) => {
      const point = s.points.find((p) => p.at === at);
      if (point) row[s.shop] = point.price;
    });
    return row;
  });

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <Link href="/components" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> {t("backToComponents")}
        </Link>

        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          <div className="overflow-hidden rounded-xl border bg-muted">
            <div className="flex aspect-square items-center justify-center text-muted-foreground">
              {comparison.componentName}
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">{comparison.componentName}</h1>
            <p className="mt-1 text-muted-foreground">
              {t("bestPrice")}: {comparison.lowestPrice != null ? formatCurrency(comparison.lowestPrice) : "N/A"}
            </p>

            <div className="mt-6 overflow-x-auto rounded-xl border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-3">{t("shop")}</th>
                    <th className="px-4 py-3">{t("price")}</th>
                    <th className="px-4 py-3">{t("discount")}</th>
                    <th className="px-4 py-3">{t("status")}</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.prices.map((p) => (
                    <tr key={p.shop} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium capitalize">{p.shop}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(p.price)}</td>
                      <td className="px-4 py-3">
                        {p.discount > 0 ? (
                          <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                            -{p.discount}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${p.inStock ? "text-green-600" : "text-red-500"}`}>
                          {p.inStock ? t("inStock") : t("outOfStock")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={p.affiliateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                        >
                          {t("buy")} <ExternalLink size={12} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {chartData.length > 0 && (
              <div className="mt-8 rounded-xl border bg-card p-6">
                <h2 className="mb-4 text-lg font-semibold">{t("priceHistory")}</h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} tickFormatter={(v: number) => formatCurrency(v)} width={80} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} labelStyle={{ fontWeight: 600 }} />
                      <Legend />
                      {shopKeys.map((shop, i) => (
                        <Line key={shop} type="monotone" dataKey={shop} stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2} dot={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {chartData.length === 0 && (
              <div className="mt-8 rounded-xl border bg-card p-6 text-center text-muted-foreground">
                {t("noHistory")}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
