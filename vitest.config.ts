import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // Default environment. API / Node-only tests should add the per-file pragma
    // `// @vitest-environment node` at the top of the file (replaces the
    // `environmentMatchGlobs` option removed in Vitest 4).
    environment: "jsdom",
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
