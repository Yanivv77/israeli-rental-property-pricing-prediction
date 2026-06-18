import "server-only";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

/**
 * Neon connection for OUR cache ("the fridge"). Node runtime only.
 *
 * Lazily initialized so the app can boot and build without DB creds — the real
 * DATABASE_URL is wired in prompt 02. The connection is created on first use;
 * the cache layer only calls this once its read/store logic lands.
 */
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set — wire the Neon connection in prompt 02 (see .env.example).",
    );
  }
  _db = drizzle(neon(url), { schema });
  return _db;
}

export { schema };
