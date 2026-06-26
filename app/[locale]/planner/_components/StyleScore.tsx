"use client";

import { useSetupStore, selectTotalPrice } from "@/store/setup";
import { Sparkles, AlertCircle, CheckCircle2, Lightbulb } from "lucide-react";

interface ScoreBarProps {
  label: string;
  value: number; // 0-100
}

function ScoreBar({ label, value }: ScoreBarProps) {
  const color =
    value >= 80
      ? "bg-emerald-500"
      : value >= 50
        ? "bg-amber-500"
        : "bg-rose-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground">{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full transition-all duration-500 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function StyleScore() {
  const { items, theme, budget } = useSetupStore();
  const total = useSetupStore(selectTotalPrice);

  const hasItems = items.length > 0;
  const hasDesk = items.some((i) => i.component.category === "desk");
  const hasChair = items.some((i) => i.component.category === "chair");
  const isOverBudget = total > budget;

  // Real-time calculated scores
  const colorHarmony = hasItems ? (theme ? 85 : 65) : 0;
  const themeConsistency = hasItems && theme ? 90 : hasItems ? 50 : 0;
  const spaceFit = hasItems ? (hasDesk && hasChair ? 95 : 70) : 0;
  const budgetBalance = hasItems ? (isOverBudget ? 30 : Math.max(45, 100 - Math.round((total / budget) * 100))) : 0;

  const overall = hasItems
    ? Math.round((colorHarmony + themeConsistency + spaceFit + budgetBalance) / 4)
    : 0;

  const ringColor =
    overall >= 80
      ? "text-emerald-500"
      : overall >= 50
        ? "text-amber-500"
        : "text-rose-500";

  // Dynamic context suggestions
  const suggestions: string[] = [];
  if (!hasItems) {
    suggestions.push("Add desk setup items to analyze your layout.");
  } else {
    if (!hasDesk) {
      suggestions.push("Select a desk first as the foundation of your setup.");
    }
    if (hasDesk && !hasChair) {
      suggestions.push("Add a matching ergonomic chair for complete comfort.");
    }
    if (isOverBudget) {
      suggestions.push("Exceeding budget! Consider swapping premium components to fit your VND budget limit.");
    }
    if (theme) {
      suggestions.push(`Applying the ${theme.name} theme recommended components will maximize your consistency score!`);
    } else {
      suggestions.push("Assign a theme configuration to optimize color harmony score.");
    }
    if (suggestions.length === 0) {
      suggestions.push("Your workspace layout is perfectly balanced! Ready to order.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold tracking-wide text-foreground">Style Analysis</h3>
      </div>

      {/* Overall score ring */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-border/40 bg-background/30 py-4 space-y-2">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="2.5"
            />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeDasharray={`${overall} ${100 - overall}`}
              strokeLinecap="round"
              className={`transition-all duration-700 ${ringColor}`}
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className={`text-2xl font-extrabold tracking-tight ${ringColor}`}>
              {overall}
            </span>
            <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">
              Style
            </span>
          </div>
        </div>
      </div>

      {hasItems ? (
        <div className="space-y-3 rounded-xl border border-border/40 bg-background/30 p-3.5">
          <div className="space-y-2.5">
            <ScoreBar label="Color Harmony" value={colorHarmony} />
            <ScoreBar label="Theme Consistency" value={themeConsistency} />
            <ScoreBar label="Space Fit" value={spaceFit} />
            <ScoreBar label="Budget Balance" value={budgetBalance} />
          </div>

          <div className="border-t border-border/40 pt-3 space-y-2">
            <h4 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              Suggestions
            </h4>
            <ul className="space-y-1.5">
              {suggestions.map((s, idx) => (
                <li key={idx} className="text-[11px] font-medium leading-normal text-muted-foreground flex gap-1.5">
                  <span className="text-primary font-bold">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/60 bg-background/20 p-6 text-center">
          <p className="text-xs text-muted-foreground">
            Add components to analyze style scoring metrics.
          </p>
        </div>
      )}
    </div>
  );
}

