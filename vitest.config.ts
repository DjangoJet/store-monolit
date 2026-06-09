import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Natywne rozwiązywanie aliasów z tsconfig (@/* → src/*).
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    // Ładuje .env, by walidacja env (src/lib/env.ts) przeszła w testach jednostkowych.
    setupFiles: ["dotenv/config"],
    include: ["src/**/*.test.ts"],
  },
});
