"use client";

import { useSetupStore } from "@/store/setup";
import { COMPONENT_CATEGORIES } from "@/lib/constants";
import {
  Laptop,
  Tv,
  Keyboard,
  Mouse,
  Lightbulb,
  Palette,
  Volume2,
  Plug,
  PlusCircle,
  HelpCircle
} from "lucide-react";
import type { ComponentCategory } from "@/lib/constants";

// Map categories to modern Lucide icons
const CATEGORY_ICONS: Record<ComponentCategory, React.ComponentType<{ className?: string }>> = {
  desk: Laptop,
  chair: HelpCircle, // fallback or generic
  monitor: Tv,
  keyboard: Keyboard,
  mouse: Mouse,
  lighting: Lightbulb,
  decor: Palette,
  audio: Volume2,
  accessory: Plug,
};

// Map chair category to a custom icon or custom SVG if Armchair is not resolving, or use a custom SVG path
const ChairIcon = (props: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
  >
    <path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" />
    <path d="M3 13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z" />
    <path d="M5 15v5" />
    <path d="M19 15v5" />
  </svg>
);

interface Props {
  onCategoryClick: (category: string) => void;
}

export function CategorySidebar({ onCategoryClick }: Props) {
  const { items } = useSetupStore();

  const counts = COMPONENT_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = items.filter((i) => i.component.category === cat).length;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-foreground">Components</h3>
      </div>

      <div className="space-y-1.5 rounded-xl border border-border/40 bg-background/30 p-2">
        {COMPONENT_CATEGORIES.map((cat) => {
          const Icon = cat === "chair" ? ChairIcon : (CATEGORY_ICONS[cat] || HelpCircle);
          const count = counts[cat];
          const hasItems = count > 0;

          return (
            <button
              key={cat}
              onClick={() => onCategoryClick(cat)}
              className="group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all duration-300 hover:bg-muted/60"
            >
              <span className="flex items-center gap-2.5 text-muted-foreground group-hover:text-foreground">
                <Icon className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span className="capitalize font-semibold text-xs">{cat.replace("_", " ")}</span>
              </span>
              {hasItems ? (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-sm">
                  {count}
                </span>
              ) : (
                <PlusCircle className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 transition-opacity text-muted-foreground" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

