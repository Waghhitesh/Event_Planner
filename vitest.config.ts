import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["src/tests/setup.ts"],
    include: ["src/tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/lib/**/*.ts", "src/app/api/**/*.ts", "src/components/**/*.tsx"],
      exclude: ["src/tests/**"],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        "src/app/api/**": { lines: 85, branches: 80 },
        "src/components/**": { lines: 85, branches: 80 },
        "src/lib/generate-plan.ts": { branches: 80 },
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname || process.cwd(), "./src"),
    },
  },
});
