"use client";

import { useSetupStore } from "@/store/setup";
import { formatCurrency } from "@/lib/utils";
import { Trash2, ExternalLink, ShoppingBag, Plus } from "lucide-react";

interface Props {
  onAddClick: () => void;
}

const SHOP_COLOR: Record<string, string> = {
  shopee: "bg-[#FF5722]/10 text-[#FF5722]",
  lazada: "bg-[#000080]/10 text-[#000080]",
  tiki: "bg-[#1890FF]/10 text-[#1890FF]",
  phongvu: "bg-[#0052CC]/10 text-[#0052CC]",
  gearvn: "bg-[#E60012]/10 text-[#E60012]",
  nhaxinh: "bg-[#5D4037]/10 text-[#5D4037]",
};

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-foreground">Items ({items.length})</h3>
        <button
          onClick={onAddClick}
          className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all duration-300 hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Item
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-background/20 p-8 text-center">
          <p className="text-xs text-muted-foreground">
            No items selected yet. Click &quot;+ Add Item&quot; or select a category to start building.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
          {Object.entries(grouped).map(([category, categoryItems]) => (
            <div key={category} className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground capitalize">
                {category.replace("_", " ")}
              </h4>
              <div className="space-y-2">
                {categoryItems.map((item) => {
                  const comp = item.component as any;
                  const price = comp.offer?.price ?? comp.price ?? 0;
                  const shop = comp.offer?.shop;
                  const url = comp.offer?.url;

                  return (
                    <div
                      key={item.id}
                      className="group relative flex items-center gap-3 rounded-xl border border-border/40 bg-background/40 p-2.5 transition-all duration-300 hover:bg-background hover:shadow-sm"
                    >
                      {comp.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={comp.imageUrl}
                          alt={comp.name}
                          className="h-10 w-10 rounded-lg object-cover border border-border/40"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground border border-border/40">
                          {comp.category.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          {comp.name}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {comp.brand}
                          </span>
                          {shop && (
                            <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase ${SHOP_COLOR[shop.toLowerCase()] || "bg-muted text-muted-foreground"}`}>
                              {shop}
                            </span>
                          )}
                        </div>
                        {price > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">
                              {formatCurrency(price)}
                            </span>
                            {url && (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer nofollow sponsored"
                                className="inline-flex items-center text-[10px] font-medium text-primary hover:underline"
                              >
                                <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">No price</span>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                        aria-label={`Remove ${comp.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

