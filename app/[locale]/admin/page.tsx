"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Database, Activity, RefreshCw, Play, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";

type ScraperLog = {
  id: string;
  scraperName: string;
  status: string;
  durationMs: number;
  upserted: number;
  skipped: number;
  errors: number;
  ranAt: string;
};

type StatusData = {
  components: number;
  prices: number;
  embeddingsStale: number;
  health: ScraperLog[];
};

type RunResult = {
  ok: boolean;
  upserted: number;
  skipped: number;
  priceChanges: number;
  errors: number;
  durationMs: number;
};

type StatsData = {
  users: number;
  components: number;
  activeComponents: number;
  setups: number;
  publicSetups: number;
  prices: number;
  staleEmbeddings: number;
  affiliateClicks: number;
};

export default function AdminPage() {
  const t = useTranslations("admin");
  const [status, setStatus] = useState<StatusData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const [statusRes, statsRes] = await Promise.all([
        fetch("/api/v1/admin/scraper/status"),
        fetch("/api/v1/admin/stats"),
      ]);
      if (statusRes.ok) setStatus(await statusRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function runScraper() {
    setRunning(true);
    setRunResult(null);
    setRunError(null);
    try {
      const res = await fetch("/api/v1/admin/scraper/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? t("scraperFailed"));
      setRunResult(json as RunResult);
      await fetchStatus();
    } catch (err) {
      setRunError(err instanceof Error ? err.message : t("unknownError"));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <button
          onClick={fetchStatus}
          disabled={statusLoading}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-border/40 bg-card px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50 transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${statusLoading ? "animate-spin" : ""}`} />
          {t("refresh")}
        </button>
      </div>

      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Activity className="h-4 w-4" />
          {t("platformOverview")}
        </h2>
        {statusLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 w-full animate-pulse rounded-2xl bg-muted/40 border border-border/30" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: t("users"), value: stats.users },
              { label: t("setups"), value: stats.setups },
              { label: t("publicSetups"), value: stats.publicSetups },
              { label: t("affiliateClicks"), value: stats.affiliateClicks },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border/40 bg-card/45 p-5 shadow-sm backdrop-blur-md">
                <p className="text-3xl font-extrabold tracking-tight text-foreground">{s.value.toLocaleString()}</p>
                <p className="text-xs font-semibold text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Database className="h-4 w-4" />
          {t("databaseMetrics")}
        </h2>
        {statusLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 w-full animate-pulse rounded-2xl bg-muted/40 border border-border/30" />
            ))}
          </div>
        ) : status ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label: t("totalComponents"), value: status.components },
              { label: t("activeOffers"), value: status.prices },
              { label: t("staleEmbeddings"), value: status.embeddingsStale, alert: status.embeddingsStale > 0 },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border/40 bg-card/45 p-5 shadow-sm backdrop-blur-md">
                <p className={`text-3xl font-extrabold tracking-tight ${s.alert ? "text-amber-500" : "text-foreground"}`}>
                  {s.value.toLocaleString()}
                </p>
                <p className="text-xs font-semibold text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-500">
            <AlertCircle className="h-5 w-5" />
            <span>{t("loadError")}</span>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-border/40 bg-card/45 p-6 backdrop-blur-md shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-primary" />
              {t("scraperOperations")}
            </h2>
            <p className="text-xs text-muted-foreground">{t("scraperOperationsDesc")}</p>
          </div>
          <button
            onClick={runScraper}
            disabled={running}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg transition-all duration-300 hover:bg-primary/95 disabled:opacity-50 hover:scale-[1.01]"
          >
            {running ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                <span>{t("runningPipeline")}</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current text-primary-foreground" />
                <span>{t("runScraper")}</span>
              </>
            )}
          </button>
        </div>

        {runResult && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm space-y-2 animate-in fade-in duration-300">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="h-4 w-4" />
              <span>{t("pipelineComplete")}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-muted-foreground sm:grid-cols-5">
              <div>
                <p className="text-foreground text-sm font-extrabold">{runResult.upserted}</p>
                <p>{t("upserted")}</p>
              </div>
              <div>
                <p className="text-foreground text-sm font-extrabold">{runResult.skipped}</p>
                <p>{t("skipped")}</p>
              </div>
              <div>
                <p className="text-foreground text-sm font-extrabold">{runResult.priceChanges}</p>
                <p>{t("priceChanges")}</p>
              </div>
              <div>
                <p className={`${runResult.errors > 0 ? "text-rose-500" : "text-foreground"} text-sm font-extrabold`}>
                  {runResult.errors}
                </p>
                <p>{t("errors")}</p>
              </div>
              <div>
                <p className="text-foreground text-sm font-extrabold">{(runResult.durationMs / 1000).toFixed(1)}s</p>
                <p>{t("duration")}</p>
              </div>
            </div>
          </div>
        )}

        {runError && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-500">
            <AlertCircle className="h-5 w-5" />
            <span>{t("error")}: {runError}</span>
          </div>
        )}
      </section>

      {status?.health && status.health.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {t("executionHistory")}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/45 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/40 bg-muted/40">
                  <tr>
                    {[t("scraper"), t("status"), t("upserted"), t("skipped"), t("errors"), t("duration"), t("executionTime")].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {status.health.map((h) => {
                    const isOk = h.status === "ok";
                    return (
                      <tr key={h.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-5 py-3 font-semibold text-foreground">{h.scraperName}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                            isOk
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                          }`}>
                            {isOk ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {h.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-medium">{h.upserted}</td>
                        <td className="px-5 py-3 font-medium text-muted-foreground">{h.skipped}</td>
                        <td className="px-5 py-3 font-medium text-muted-foreground">{h.errors}</td>
                        <td className="px-5 py-3 font-medium">{(h.durationMs / 1000).toFixed(1)}s</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">
                          {new Date(h.ranAt).toLocaleString("vi-VN")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
