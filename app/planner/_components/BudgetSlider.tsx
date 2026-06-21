"use client";

import { useSetupStore, selectTotalPrice } from "@/store/setup";
import { formatCurrency } from "@/lib/utils";
import { Coins, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";

const PRESETS = [
  { label: "5M", value: 5_000_000 },
  { label: "10M", value: 10_000_000 },
  { label: "20M", value: 20_000_000 },
  { label: "50M", value: 50_000_000 },
];

export function BudgetSlider() {
  const { budget, setBudget } = useSetupStore();
  const total = useSetupStore(selectTotalPrice);

  const progress = budget > 0 ? Math.min(100, (total / budget) * 100) : 0;
  const isOverBudget = total > budget;
  const isNearBudget = !isOverBudget && progress > 90;

  let progressColor = "bg-emerald-500";
  let statusColor = "text-emerald-500";
  let StatusIcon = CheckCircle;
  let statusText = "Under Budget";

  if (isOverBudget) {
    progressColor = "bg-rose-500";
    statusColor = "text-rose-500";
    StatusIcon = AlertCircle;
    statusText = "Over Budget";
  } else if (isNearBudget) {
    progressColor = "bg-amber-500";
    statusColor = "text-amber-500";
    StatusIcon = AlertTriangle;
    statusText = "Nearing Limit";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Coins className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold tracking-wide text-foreground">Budget Planner</h3>
      </div>

      <div className="space-y-2 rounded-xl border border-border/40 bg-background/30 p-3.5">
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-bold text-foreground">{formatCurrency(budget)}</span>
          <span className="text-[11px] font-medium text-muted-foreground">
            Limit (VND)
          </span>
        </div>

        {/* Range slider */}
        <input
          type="range"
          min={1_000_000}
          max={50_000_000}
          step={1_000_000}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary focus:outline-none"
        />

        {/* Preset buttons */}
        <div className="flex gap-1.5 pt-1">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setBudget(p.value)}
              className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-all duration-300 ${
                budget === p.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border/40 bg-background/50 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Usage Indicator Card */}
      <div className="rounded-xl border border-border/40 bg-background/30 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Workspace Cost</span>
          <span className="text-sm font-bold text-foreground">{formatCurrency(total)}</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>

        <div className={`flex items-center gap-1.5 text-xs font-semibold ${statusColor}`}>
          <StatusIcon className="h-3.5 w-3.5" />
          <span>{statusText} ({progress.toFixed(0)}%)</span>
        </div>
      </div>
    </div>
  );
}

