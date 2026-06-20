"use client";

import { useSetupStore } from "@/store/setup";
import { formatCurrency } from "@/lib/utils";

interface Props {
  onAddClick: () => void;
}

export function SelectedItems({ onAddClick }: Props) {
  const items = useSetupStore((s) => s.items);
  const removeItem = useSetupStore((s) => s.removeItem);

  // Group by category
  const grouped: Record<string, typeof items> = {};
  for (const item of items) {
    const cat = item.component.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Items ({items.length})</h3>
        <button
          onClick={onAddClick}
          className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Add
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No items yet. Click + Add or a category to browse.
        </p>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([category, categoryItems]) => (
            <div key={category} className="space-y-1.5">
              <h4 className="text-xs font-medium text-muted-foreground capitalize">
                {category.replace("_", " ")}
              </h4>
              {categoryItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-md border bg-background p-2"
                >
                  {item.component.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.component.imageUrl}
                      alt={item.component.name}
                      className="h-8 w-8 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-xs">
                      {item.component.category.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">
                      {item.component.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.component.brand}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${item.component.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
