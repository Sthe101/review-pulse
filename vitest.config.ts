import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    environmentMatchGlobs: [
      ["src/__tests__/integration/**/api/**", "node"],
      ["src/__tests__/**/*.api.test.ts", "node"],
      ["src/app/api/**/*.test.ts", "node"],
    ],
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [
        "node_modules/**",
        ".next/**",
        "e2e/**",
        "src/test/**",
        "src/**/*.{test,spec}.{ts,tsx}",
        "**/*.config.{ts,js,mjs}",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
