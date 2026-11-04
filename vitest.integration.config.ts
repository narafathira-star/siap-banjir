import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Integration test memakai database dari .env (DATABASE_URL).
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    env: loadEnv("test", process.cwd(), ""),
    // Berbagi satu database: jalankan berurutan.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
