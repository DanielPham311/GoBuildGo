"use client";

import { useState } from "react";
import { useSetupStore } from "@/store/setup";
import type { PublicComponent } from "@/modules/components";
import type { PublicTheme } from "@/modules/themes";
import { RoomSelector } from "./_components/RoomSelector";
import { BudgetSlider } from "./_components/BudgetSlider";
import { CategorySidebar } from "./_components/CategorySidebar";
import { RoomVisualizer } from "./_components/RoomVisualizer";
import { SelectedItems } from "./_components/SelectedItems";
import { ComponentPicker } from "./_components/ComponentPicker";
import { StyleScore } from "./_components/StyleScore";
import { PlannerTopBar } from "./_components/PlannerTopBar";

export default function PlannerPage() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const openPicker = (category: string) => {
    setActiveCategory(category);
    setPickerOpen(true);
  };

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col">
      {/* Top bar */}
      <PlannerTopBar />

      {/* 3-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Room config + categories */}
        <aside className="w-[280px] shrink-0 overflow-y-auto border-r bg-muted/30 p-4 space-y-6">
          <RoomSelector />
          <BudgetSlider />
          <CategorySidebar onCategoryClick={openPicker} />
        </aside>

        {/* Center: 2D visualizer */}
        <main className="flex-1 overflow-hidden">
          <RoomVisualizer />
        </main>

        {/* Right: Selected items + style score */}
        <aside className="w-[300px] shrink-0 overflow-y-auto border-l bg-muted/30 p-4 space-y-6">
          <SelectedItems onAddClick={() => openPicker("all")} />
          <StyleScore />
        </aside>
      </div>

      {/* Component picker modal */}
      {pickerOpen && (
        <ComponentPicker
          category={activeCategory}
          onClose={() => {
            setPickerOpen(false);
            setActiveCategory(null);
          }}
        />
      )}
    </div>
  );
}
