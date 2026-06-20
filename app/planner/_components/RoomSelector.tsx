"use client";

import { useSetupStore } from "@/store/setup";
import { ROOM_TYPES } from "@/lib/constants";

const ROOM_LABELS: Record<string, string> = {
  bedroom: "Bedroom",
  gaming_room: "Gaming Room",
  office: "Office",
  studio: "Studio",
};

const ROOM_ICONS: Record<string, string> = {
  bedroom: "🛏️",
  gaming_room: "🎮",
  office: "💼",
  studio: "🎙️",
};

export function RoomSelector() {
  const { roomType, setRoomType, roomWidth, roomDepth, setRoomDimensions } =
    useSetupStore();

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Room Type</h3>

      <div className="grid grid-cols-2 gap-2">
        {ROOM_TYPES.map((rt) => (
          <button
            key={rt}
            onClick={() => setRoomType(rt)}
            className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-sm transition-colors ${
              roomType === rt
                ? "border-primary bg-primary/10"
                : "hover:bg-muted"
            }`}
          >
            <span className="text-lg">{ROOM_ICONS[rt]}</span>
            <span className="text-xs">{ROOM_LABELS[rt]}</span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground">
          Dimensions (cm)
        </h4>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Width</label>
            <input
              type="number"
              min={100}
              max={1000}
              value={roomWidth}
              onChange={(e) =>
                setRoomDimensions(Number(e.target.value), roomDepth)
              }
              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Depth</label>
            <input
              type="number"
              min={100}
              max={1000}
              value={roomDepth}
              onChange={(e) =>
                setRoomDimensions(roomWidth, Number(e.target.value))
              }
              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
