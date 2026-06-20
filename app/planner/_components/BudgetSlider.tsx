"use client";

import { useSetupStore } from "@/store/setup";
import { formatCurrency } from "@/lib/utils";

const PRESETS = [
  { label: "5M", value: 5_000_000 },
  { label: "10M", value: 10_000_000 },
  { label: "20M", value: 20_000_000 },
  { label: "50M", value: 50_000_000 },
];

export function BudgetSlider() {
  const { budget, setBudget, items } = useSetupStore();

  // Calculate total from items (prices not on PublicComponent yet, so 0 for now)
  const total = 0; // TODO: sum item prices when price data is available
  const progress = budget > 0 ? Math.min(100, (total / budget) * 100) : 0;

  const progressColor =
    progress > 100 ? "bg-destructive" : progress > 90 ? "bg-warning" : "bg-success";

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Budget</h3>

      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-bold">{formatCurrency(budget)}</span>
          <span className="text-xs text-muted-foreground">
            Used: {formatCurrency(total)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full transition-all ${progressColor}`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>

      {/* Range slider */}
      <input
        type="range"
        min={500_000}
        max={50_000_000}
        step={500_000}
        value={budget}
        onChange={(e) => setBudget(Number(e.target.value))}
        className="w-full accent-primary"
      />

      {/* Preset buttons */}
      <div className="flex gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => setBudget(p.value)}
            className={`flex-1 rounded-md border px-2 py-1 text-xs transition-colors ${
              budget === p.value
                ? "border-primary bg-primary/10"
                : "hover:bg-muted"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
