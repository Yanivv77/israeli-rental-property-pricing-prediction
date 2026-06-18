import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

/**
 * Drizzle is the ORM for OUR Neon cache ("the fridge") only — never a wrapper
 * over the government APIs. `drizzle-kit generate` reads ./lib/db/schema.ts and
 * emits SQL migrations into ./drizzle. Only `migrate`/`push` need DATABASE_URL
 * (prompt 02); `generate` works from the schema alone.
 *
 * Auto-load .env.local (gitignored) so `pnpm db:push` picks up DATABASE_URL
 * without exporting it by hand. On Vercel the env is injected, so the file is
 * absent and this is a no-op.
 */
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
