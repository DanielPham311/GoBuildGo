"use client";

import { useState, useRef, useEffect } from "react";
import { useSetupStore, selectTotalPrice } from "@/store/setup";
import { formatCurrency } from "@/lib/utils";
import { Grid3x3, Trash2, Info, X, ExternalLink, HelpCircle } from "lucide-react";

function getItemDimensions(category: string) {
  switch (category) {
    case "desk":
      return { w: 120, h: 55 };
    case "chair":
      return { w: 42, h: 42 };
    case "monitor":
      return { w: 64, h: 10 };
    case "keyboard":
      return { w: 38, h: 14 };
    case "mouse":
      return { w: 12, h: 20 };
    case "lighting":
      return { w: 22, h: 22 };
    case "decor":
      return { w: 24, h: 24 };
    case "audio":
      return { w: 18, h: 22 };
    case "accessory":
      return { w: 18, h: 18 };
    default:
      return { w: 40, h: 40 };
  }
}

export function RoomVisualizer() {
  const { roomWidth, roomDepth, items, roomType, updateItemPosition, removeItem } = useSetupStore();
  const [showGrid, setShowGrid] = useState(true);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  // Dragging states
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const dragStartPoint = useRef({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);

  // Scale room to fit canvas (max 650x420)
  const maxW = 650;
  const maxH = 420;
  const scale = Math.min(maxW / roomWidth, maxH / roomDepth, 1);
  const svgW = roomWidth * scale;
  const svgH = roomDepth * scale;

  // Handle outside click to clear active item tooltip
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (svgRef.current && !svgRef.current.contains(e.target as Node)) {
        setActiveItemId(null);
      }
    }
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Mouse & Touch Drag Event Handlers
  const handleStart = (id: string, clientX: number, clientY: number, currentX: number, currentY: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xInSvg = ((clientX - rect.left) / rect.width) * svgW;
    const yInSvg = ((clientY - rect.top) / rect.height) * svgH;

    setDraggedId(id);
    setOffset({ x: xInSvg - currentX, y: yInSvg - currentY });
    dragStartPoint.current = { x: clientX, y: clientY };
    setHasMoved(false);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!draggedId || !svgRef.current) return;
    
    // Check click vs drag threshold
    const dist = Math.hypot(clientX - dragStartPoint.current.x, clientY - dragStartPoint.current.y);
    if (dist > 3) {
      setHasMoved(true);
    }

    const rect = svgRef.current.getBoundingClientRect();
    const xInSvg = ((clientX - rect.left) / rect.width) * svgW;
    const yInSvg = ((clientY - rect.top) / rect.height) * svgH;

    const item = items.find((i) => i.id === draggedId);
    if (!item) return;

    const { w, h } = getItemDimensions(item.component.category);
    let newX = xInSvg - offset.x;
    let newY = yInSvg - offset.y;

    // Constrain inside room bounds
    newX = Math.max(0, Math.min(newX, svgW - w));
    newY = Math.max(0, Math.min(newY, svgH - h));

    updateItemPosition(draggedId, { x: newX, y: newY });
  };

  const handleEnd = () => {
    if (!hasMoved && draggedId) {
      setActiveItemId(draggedId === activeItemId ? null : draggedId);
    }
    setDraggedId(null);
  };

  const activeItem = items.find((i) => i.id === activeItemId);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Visualizer header */}
      <div className="flex items-center justify-between border-b border-border/40 px-6 py-3 bg-background/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary capitalize">
            {roomType ? roomType.replace("_", " ") : "Office Workspace"}
          </span>
          <span className="text-xs font-semibold text-muted-foreground">
            {roomWidth} × {roomDepth} cm
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all duration-300 ${
              showGrid
                ? "border-primary bg-primary/5 text-primary"
                : "border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Grid3x3 className="h-3.5 w-3.5" />
            Grid
          </button>
          <span className="text-xs font-semibold text-muted-foreground">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative flex flex-1 items-center justify-center bg-muted/10 p-6 overflow-hidden">
        {items.length === 0 ? (
          <div className="text-center space-y-3 max-w-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5 border border-primary/20 text-3xl shadow-sm animate-pulse">
              🪑
            </div>
            <h4 className="text-sm font-bold text-foreground">Plan Your Space</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Start by choosing a desk from the components sidebar on the left. Position, drag, and design your layout.
            </p>
          </div>
        ) : (
          <div className="relative">
            <svg
              ref={svgRef}
              width={svgW}
              height={svgH}
              viewBox={`0 0 ${svgW} ${svgH}`}
              onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchMove={(e) => {
                if (e.touches[0]) handleMove(e.touches[0].clientX, e.touches[0].clientY);
              }}
              onTouchEnd={handleEnd}
              className="rounded-2xl border border-border bg-card shadow-lg select-none"
            >
              {/* Grid lines overlay */}
              {showGrid &&
                Array.from({ length: Math.floor(roomWidth / 30) }).map((_, i) => (
                  <line
                    key={`vg-${i}`}
                    x1={(i + 1) * 30 * scale}
                    y1={0}
                    x2={(i + 1) * 30 * scale}
                    y2={svgH}
                    stroke="hsl(var(--border))"
                    strokeWidth={0.5}
                    strokeDasharray="4 4"
                    opacity={0.3}
                  />
                ))}
              {showGrid &&
                Array.from({ length: Math.floor(roomDepth / 30) }).map((_, i) => (
                  <line
                    key={`hg-${i}`}
                    x1={0}
                    y1={(i + 1) * 30 * scale}
                    y2={(i + 1) * 30 * scale}
                    x2={svgW}
                    stroke="hsl(var(--border))"
                    strokeWidth={0.5}
                    strokeDasharray="4 4"
                    opacity={0.3}
                  />
                ))}

              {/* Placed items */}
              {items.map((item, idx) => {
                const { w, h } = getItemDimensions(item.component.category);
                
                // Fallback position calculation
                const defaultX = (svgW / (items.length + 1)) * (idx + 1) - w / 2;
                const defaultY = svgH / 2 - h / 2;
                
                const x = item.position?.x ?? defaultX;
                const y = item.position?.y ?? defaultY;

                const isDragged = draggedId === item.id;
                const isActive = activeItemId === item.id;

                return (
                  <g
                    key={item.id}
                    className="cursor-move group"
                    onMouseDown={(e) => handleStart(item.id, e.clientX, e.clientY, x, y)}
                    onTouchStart={(e) => {
                      if (e.touches[0]) {
                        handleStart(item.id, e.touches[0].clientX, e.touches[0].clientY, x, y);
                      }
                    }}
                  >
                    {/* Glowing selection outline */}
                    {(isDragged || isActive) && (
                      <rect
                        x={x - 3}
                        y={y - 3}
                        width={w + 6}
                        height={h + 6}
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                        rx={8}
                        className="animate-pulse"
                      />
                    )}

                    {/* Detailed Vector Graphics for different Categories */}
                    {item.component.category === "desk" && (
                      <g>
                        {/* Wooden Desk Top */}
                        <rect
                          x={x}
                          y={y}
                          width={w}
                          height={h}
                          fill="hsl(32, 24%, 32%)"
                          stroke="hsl(32, 24%, 20%)"
                          strokeWidth={1.5}
                          rx={4}
                        />
                        {/* Accent top stripe */}
                        <rect
                          x={x + 5}
                          y={y + 3}
                          width={w - 10}
                          height={4}
                          fill="hsl(32, 20%, 45%)"
                          opacity={0.3}
                        />
                      </g>
                    )}

                    {item.component.category === "chair" && (
                      <g>
                        {/* Star base legs */}
                        <circle cx={x + w / 2} cy={y + h / 2} r={w / 2.2} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth={1} opacity={0.5} />
                        {/* Seat Cushion */}
                        <rect
                          x={x + 4}
                          y={y + 6}
                          width={w - 8}
                          height={h - 10}
                          fill="hsl(215, 20%, 15%)"
                          stroke="hsl(215, 20%, 25%)"
                          strokeWidth={1.5}
                          rx={8}
                        />
                        {/* Backrest support */}
                        <rect
                          x={x + w / 2 - 8}
                          y={y + h - 5}
                          width={16}
                          height={4}
                          fill="hsl(215, 10%, 30%)"
                          rx={1}
                        />
                        <rect
                          x={x + 2}
                          y={y + h - 2}
                          width={w - 4}
                          height={4}
                          fill="hsl(215, 20%, 10%)"
                          rx={2}
                        />
                      </g>
                    )}

                    {item.component.category === "monitor" && (
                      <g>
                        {/* Stand Base */}
                        <rect
                          x={x + w / 2 - 12}
                          y={y + h - 2}
                          width={24}
                          height={4}
                          fill="hsl(210, 10%, 30%)"
                          rx={1}
                        />
                        {/* Screen */}
                        <rect
                          x={x}
                          y={y}
                          width={w}
                          height={h - 4}
                          fill="hsl(210, 20%, 8%)"
                          stroke="hsl(210, 20%, 35%)"
                          strokeWidth={1}
                          rx={2}
                        />
                        {/* Glossy highlight */}
                        <line x1={x + 2} y1={y + 2} x2={x + w - 2} y2={y + 2} stroke="hsl(0, 0%, 100%)" strokeWidth={0.5} opacity={0.2} />
                      </g>
                    )}

                    {item.component.category === "keyboard" && (
                      <g>
                        <rect
                          x={x}
                          y={y}
                          width={w}
                          height={h}
                          fill="hsl(220, 15%, 12%)"
                          stroke="hsl(220, 15%, 25%)"
                          strokeWidth={1}
                          rx={2}
                        />
                        {/* Key grid stripes */}
                        <line x1={x + 3} y1={y + 4} x2={x + w - 3} y2={y + 4} stroke="hsl(220, 10%, 40%)" strokeWidth={1} strokeDasharray="2 1" />
                        <line x1={x + 3} y1={y + 8} x2={x + w - 3} y2={y + 8} stroke="hsl(220, 10%, 40%)" strokeWidth={1} strokeDasharray="1.5 1" />
                      </g>
                    )}

                    {item.component.category === "mouse" && (
                      <g>
                        <rect
                          x={x}
                          y={y}
                          width={w}
                          height={h}
                          fill="hsl(220, 12%, 15%)"
                          stroke="hsl(220, 12%, 30%)"
                          strokeWidth={1}
                          rx={6}
                        />
                        {/* Scroll wheel */}
                        <line x1={x + w / 2} y1={y + 3} x2={x + w / 2} y2={y + 8} stroke="hsl(var(--primary))" strokeWidth={1.2} />
                      </g>
                    )}

                    {item.component.category === "lighting" && (
                      <g>
                        {/* Soft ambient glow circle */}
                        <circle cx={x + w / 2} cy={y + h / 2} r={w / 1.5} fill="hsl(45, 100%, 50%)" opacity={0.12} />
                        <circle cx={x + w / 2} cy={y + h / 2} r={w / 2} fill="hsl(45, 100%, 60%)" opacity={0.2} />
                        {/* Light fixture */}
                        <circle cx={x + w / 2} cy={y + h / 2} r={w / 4} fill="hsl(45, 100%, 75%)" stroke="hsl(45, 80%, 40%)" strokeWidth={1} />
                      </g>
                    )}

                    {item.component.category === "decor" && (
                      <g>
                        {/* Plant Pot */}
                        <circle cx={x + w / 2} cy={y + h / 2} r={w / 2.6} fill="hsl(25, 45%, 45%)" stroke="hsl(25, 45%, 30%)" strokeWidth={1} />
                        {/* Green leaves */}
                        <path d={`M${x + w / 2} ${y + 3} C ${x + w / 2 - 8} ${y + 10}, ${x + w / 2 - 4} ${y + 10}, ${x + w / 2} ${y + h / 2}`} fill="hsl(120, 45%, 35%)" />
                        <path d={`M${x + w / 2} ${y + 3} C ${x + w / 2 + 8} ${y + 10}, ${x + w / 2 + 4} ${y + 10}, ${x + w / 2} ${y + h / 2}`} fill="hsl(120, 50%, 30%)" />
                      </g>
                    )}

                    {item.component.category === "audio" && (
                      <g>
                        <rect
                          x={x}
                          y={y}
                          width={w}
                          height={h}
                          fill="hsl(0, 0%, 12%)"
                          stroke="hsl(0, 0%, 25%)"
                          strokeWidth={1}
                          rx={3}
                        />
                        {/* Speaker cone circle */}
                        <circle cx={x + w / 2} cy={y + h / 2 + 2} r={w / 3.2} fill="hsl(0, 0%, 20%)" stroke="hsl(0, 0%, 40%)" strokeWidth={1} />
                        <circle cx={x + w / 2} cy={y + h / 2 + 2} r={w / 6} fill="hsl(0, 0%, 10%)" />
                      </g>
                    )}

                    {/* Default placeholder for accessories */}
                    {item.component.category === "accessory" && (
                      <g>
                        <rect
                          x={x}
                          y={y}
                          width={w}
                          height={h}
                          fill="hsl(210, 10%, 18%)"
                          stroke="hsl(210, 10%, 30%)"
                          strokeWidth={1}
                          rx={4}
                        />
                        {/* Details */}
                        <circle cx={x + w / 2} cy={y + h / 2} r={3} fill="hsl(210, 100%, 55%)" />
                      </g>
                    )}

                    {/* Muted category label text when not selected */}
                    {!isDragged && !isActive && (
                      <text
                        x={x + w / 2}
                        y={y + h / 2 + 3}
                        textAnchor="middle"
                        fontSize={8}
                        fontWeight="bold"
                        fill="white"
                        className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      >
                        {item.component.category.slice(0, 3).toUpperCase()}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Absolute Floating Tooltip Card */}
            {activeItem && (
              <div
                className="absolute z-20 flex w-52 flex-col rounded-xl border border-border/50 bg-background/95 p-3.5 shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in zoom-in-95"
                style={{
                  // Position relative to SVG container
                  left: `${Math.min(85, Math.max(5, (activeItem.position?.x ?? 0) / svgW * 100))}%`,
                  top: `${Math.min(75, Math.max(5, ((activeItem.position?.y ?? 0) - 75) / svgH * 100))}%`,
                }}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {activeItem.component.category}
                    </p>
                    <p className="truncate text-xs font-bold text-foreground">
                      {activeItem.component.name}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveItemId(null)}
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2">
                  <span className="text-xs font-extrabold text-foreground">
                    {(activeItem.component as any).offer?.price
                      ? formatCurrency((activeItem.component as any).offer.price)
                      : "No price available"}
                  </span>
                  <button
                    onClick={() => {
                      removeItem(activeItem.id);
                      setActiveItemId(null);
                    }}
                    className="flex items-center gap-1 rounded bg-rose-500/10 px-2 py-1 text-[10px] font-bold text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

