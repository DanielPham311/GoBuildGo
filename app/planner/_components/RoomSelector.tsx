"use client";

import { useSetupStore } from "@/store/setup";
import { ROOM_TYPES } from "@/lib/constants";
import { Bed, Gamepad, Briefcase, Mic, HelpCircle } from "lucide-react";
import type { RoomType } from "@/lib/constants";

const ROOM_LABELS: Record<RoomType, string> = {
  bedroom: "Bedroom",
  gaming_room: "Gaming Room",
  office: "Office",
  studio: "Studio",
};

const ROOM_ICONS: Record<RoomType, React.ComponentType<{ className?: string }>> = {
  bedroom: Bed,
  gaming_room: Gamepad,
  office: Briefcase,
  studio: Mic,
};

export function RoomSelector() {
  const { roomType, setRoomType, roomWidth, roomDepth, setRoomDimensions } =
    useSetupStore();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-foreground">Room Type</h3>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {ROOM_TYPES.map((rt) => {
          const Icon = ROOM_ICONS[rt] || HelpCircle;
          const isSelected = roomType === rt;
          return (
            <button
              key={rt}
              onClick={() => setRoomType(rt)}
              className={`flex flex-col items-center gap-2 rounded-xl border p-3.5 text-center transition-all duration-300 ${
                isSelected
                  ? "border-primary bg-primary/5 text-primary shadow-sm scale-[1.02] ring-1 ring-primary/20"
                  : "border-border/50 bg-background/50 hover:bg-muted/50 hover:border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
              <span className="text-xs font-semibold">{ROOM_LABELS[rt]}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2.5 rounded-xl border border-border/40 bg-background/30 p-3">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Room Dimensions (cm)
        </h4>
        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Width</label>
            <div className="relative flex items-center">
              <input
                type="number"
                min={100}
                max={1000}
                value={roomWidth}
                onChange={(e) =>
                  setRoomDimensions(Number(e.target.value), roomDepth)
                }
                className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm font-medium focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
              <span className="absolute right-3 text-xs text-muted-foreground">cm</span>
            </div>
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Depth</label>
            <div className="relative flex items-center">
              <input
                type="number"
                min={100}
                max={1000}
                value={roomDepth}
                onChange={(e) =>
                  setRoomDimensions(roomWidth, Number(e.target.value))
                }
                className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm font-medium focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
              <span className="absolute right-3 text-xs text-muted-foreground">cm</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

