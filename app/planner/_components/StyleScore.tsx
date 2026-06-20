"use client";

import { useSetupStore } from "@/store/setup";

interface ScoreBarProps {
  label: string;
  value: number; // 0-100
}

function ScoreBar({ label, value }: ScoreBarProps) {
  const color =
    value >= 80 ? "bg-success" : value >= 50 ? "bg-warning" : "bg-destructive";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span>{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full transition-all ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function StyleScore() {
  const { items, theme } = useSetupStore();

  // Placeholder scores — real engine in Step 5
  const hasItems = items.length > 0;
  const colorHarmony = hasItems ? 65 : 0;
  const themeConsistency = hasItems && theme ? 70 : 0;
  const spaceFit = hasItems ? 80 : 0;
  const budgetBalance = hasItems ? 55 : 0;
  const overall = hasItems
    ? Math.round((colorHarmony + themeConsistency + spaceFit + budgetBalance) / 4)
    : 0;

  const ringColor =
    overall >= 80
      ? "text-success"
      : overall >= 50
        ? "text-warning"
        : "text-destructive";

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Style Score</h3>

      {/* Overall score ring */}
      <div className="flex items-center justify-center">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${overall} ${100 - overall}`}
              strokeLinecap="round"
              className={ringColor}
            />
          </svg>
          <span className={`absolute text-lg font-bold ${ringColor}`}>
            {overall}
          </span>
        </div>
      </div>

      {hasItems ? (
        <div className="space-y-2">
          <ScoreBar label="Color Harmony" value={colorHarmony} />
          <ScoreBar label="Theme Consistency" value={themeConsistency} />
          <ScoreBar label="Space Fit" value={spaceFit} />
          <ScoreBar label="Budget Balance" value={budgetBalance} />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center">
          Add components to see your style score
        </p>
      )}
    </div>
  );
}
