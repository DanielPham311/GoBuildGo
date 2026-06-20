import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RoomType } from "@/lib/constants";
import type { PublicComponent } from "@/modules/components";
import type { PublicTheme } from "@/modules/themes";

/** A component added to the current setup. */
export interface SetupItem {
  id: string;
  component: PublicComponent;
  position?: { x: number; y: number };
  sortOrder: number;
}

interface SetupState {
  // Room config
  roomType: RoomType | null;
  roomWidth: number; // cm
  roomDepth: number; // cm

  // Setup meta
  name: string;
  theme: PublicTheme | null;

  // Budget (VND)
  budget: number;

  // Selected components
  items: SetupItem[];

  // Actions
  setRoomType: (roomType: RoomType | null) => void;
  setRoomDimensions: (width: number, depth: number) => void;
  setName: (name: string) => void;
  setTheme: (theme: PublicTheme | null) => void;
  setBudget: (budget: number) => void;
  addItem: (component: PublicComponent) => void;
  removeItem: (componentId: string) => void;
  updateItemPosition: (componentId: string, position: { x: number; y: number }) => void;
  reorderItems: (items: SetupItem[]) => void;
  reset: () => void;
  loadSetup: (data: {
    name: string;
    roomType: RoomType | null;
    roomWidth: number;
    roomDepth: number;
    theme: PublicTheme | null;
    budget: number;
    items: SetupItem[];
  }) => void;
}

const DEFAULT_ROOM_WIDTH = 300;
const DEFAULT_ROOM_DEPTH = 250;

export const useSetupStore = create<SetupState>()(
  persist(
    (set) => ({
      roomType: null,
      roomWidth: DEFAULT_ROOM_WIDTH,
      roomDepth: DEFAULT_ROOM_DEPTH,
      name: "My Setup",
      theme: null,
      budget: 10_000_000, // 10M VND default
      items: [],

      setRoomType: (roomType) => set({ roomType }),

      setRoomDimensions: (width, depth) => set({ roomWidth: width, roomDepth: depth }),

      setName: (name) => set({ name }),

      setTheme: (theme) => set({ theme }),

      setBudget: (budget) => set({ budget }),

      addItem: (component) =>
        set((state) => {
          // Prevent duplicates
          if (state.items.some((i) => i.id === component.id)) return state;
          const newItem: SetupItem = {
            id: component.id,
            component,
            position: undefined,
            sortOrder: state.items.length,
          };
          return { items: [...state.items, newItem] };
        }),

      removeItem: (componentId) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== componentId),
        })),

      updateItemPosition: (componentId, position) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === componentId ? { ...i, position } : i
          ),
        })),

      reorderItems: (items) => set({ items }),

      reset: () =>
        set({
          roomType: null,
          roomWidth: DEFAULT_ROOM_WIDTH,
          roomDepth: DEFAULT_ROOM_DEPTH,
          name: "My Setup",
          theme: null,
          budget: 10_000_000,
          items: [],
        }),

      loadSetup: (data) =>
        set({
          name: data.name,
          roomType: data.roomType,
          roomWidth: data.roomWidth,
          roomDepth: data.roomDepth,
          theme: data.theme,
          budget: data.budget,
          items: data.items,
        }),
    }),
    {
      name: "gobuildgo-setup", // localStorage key
      version: 1,
    }
  )
);

/** Derived helpers (use in components): */
export function selectTotalPrice(state: SetupState): number {
  return state.items.reduce((sum, item) => {
    return sum + ((item.component as unknown as { price?: number }).price ?? 0);
  }, 0);
}

export function selectBudgetProgress(state: SetupState): number {
  const total = selectTotalPrice(state);
  if (state.budget <= 0) return 0;
  return Math.min(100, (total / state.budget) * 100);
}
