"use client";

import { useSetupStore } from "@/store/setup";

export function PlannerTopBar() {
  const { name, setName, reset } = useSetupStore();

  return (
    <header className="flex items-center justify-between border-b bg-background px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => history.back()}
          className="rounded-md p-1.5 hover:bg-muted"
          aria-label="Back"
        >
          ←
        </button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border-none bg-transparent text-lg font-semibold focus:outline-none focus:ring-0"
          placeholder="Setup name..."
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={reset}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
        >
          Reset
        </button>
        <button
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          disabled
          title="Save (requires auth)"
        >
          Save
        </button>
        <button
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
          disabled
          title="Share (requires save)"
        >
          Share
        </button>
      </div>
    </header>
  );
}
