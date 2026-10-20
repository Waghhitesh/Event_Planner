import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/lib/**/*.ts"],
      exclude: ["src/tests/**"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname || process.cwd(), "./src"),
    },
  },
});
