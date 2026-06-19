import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["{app,modules,shared,lib,components}/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "e2e", ".next"],
  },
  resolve: {
    alias: { "@": resolve(__dirname, "./") },
  },
});
