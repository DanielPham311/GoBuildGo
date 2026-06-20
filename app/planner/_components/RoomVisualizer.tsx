"use client";

import { useSetupStore } from "@/store/setup";

export function RoomVisualizer() {
  const { roomWidth, roomDepth, items, roomType } = useSetupStore();

  // Scale room to fit canvas (max 600x400)
  const maxW = 600;
  const maxH = 400;
  const scale = Math.min(maxW / roomWidth, maxH / roomDepth, 1);
  const svgW = roomWidth * scale;
  const svgH = roomDepth * scale;

  return (
    <div className="flex h-full flex-col">
      {/* Visualizer header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-sm font-medium">
          {roomType ? roomType.replace("_", " ") : "Room"} — {roomWidth}×{roomDepth}cm
        </span>
        <span className="text-xs text-muted-foreground">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* SVG canvas */}
      <div className="flex flex-1 items-center justify-center bg-muted/20 p-4">
        {items.length === 0 ? (
          <div className="text-center">
            <div className="text-6xl mb-4">🪑</div>
            <p className="text-muted-foreground text-sm">
              Start by selecting a desk
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Click a category on the left to browse components
            </p>
          </div>
        ) : (
          <svg
            width={svgW}
            height={svgH}
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="rounded-lg border bg-background shadow-sm"
          >
            {/* Room outline */}
            <rect
              x={0}
              y={0}
              width={svgW}
              height={svgH}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth={2}
              rx={4}
            />

            {/* Grid lines */}
            {Array.from({ length: Math.floor(roomWidth / 50) }).map((_, i) => (
              <line
                key={`vg-${i}`}
                x1={(i + 1) * 50 * scale}
                y1={0}
                x2={(i + 1) * 50 * scale}
                y2={svgH}
                stroke="hsl(var(--border))"
                strokeWidth={0.5}
                strokeDasharray="4 4"
                opacity={0.3}
              />
            ))}
            {Array.from({ length: Math.floor(roomDepth / 50) }).map((_, i) => (
              <line
                key={`hg-${i}`}
                x1={0}
                y1={(i + 1) * 50 * scale}
                x2={svgW}
                y2={(i + 1) * 50 * scale}
                stroke="hsl(var(--border))"
                strokeWidth={0.5}
                strokeDasharray="4 4"
                opacity={0.3}
              />
            ))}

            {/* Placed items */}
            {items.map((item, idx) => {
              const x = item.position?.x ?? (svgW / (items.length + 1)) * (idx + 1) - 30;
              const y = item.position?.y ?? svgH / 2 - 20;
              const w = 60;
              const h = 40;
              return (
                <g key={item.id}>
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill="hsl(var(--primary) / 0.1)"
                    stroke="hsl(var(--primary))"
                    strokeWidth={1.5}
                    rx={4}
                  />
                  <text
                    x={x + w / 2}
                    y={y + h / 2 + 4}
                    textAnchor="middle"
                    fontSize={10}
                    fill="hsl(var(--foreground))"
                  >
                    {item.component.category.slice(0, 3).toUpperCase()}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
