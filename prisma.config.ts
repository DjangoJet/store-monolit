import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7: URL połączenia dla Migrate/Studio trzyma się tutaj (nie w schema.prisma).
// Runtime używa driver adaptera (patrz src/lib/prisma.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
