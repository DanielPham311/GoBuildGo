"use client";

import { useSetupStore } from "@/store/setup";
import { COMPONENT_CATEGORIES } from "@/lib/constants";

const CATEGORY_ICONS: Record<string, string> = {
  desk: "🪑",
  chair: "💺",
  monitor: "🖥️",
  keyboard: "⌨️",
  mouse: "🖱️",
  lighting: "💡",
  decor: "🪴",
  audio: "🔊",
  accessory: "🔌",
};

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
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Components</h3>

      <div className="space-y-1">
        {COMPONENT_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryClick(cat)}
            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <span className="flex items-center gap-2">
              <span>{CATEGORY_ICONS[cat]}</span>
              <span className="capitalize">{cat.replace("_", " ")}</span>
            </span>
            {counts[cat] > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium">
                {counts[cat]}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
