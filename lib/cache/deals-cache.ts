import "server-only";
import type { Deal } from "@/types/property";

/**
 * Cache-first access to "the fridge" (our Neon `deals` + `gush_sync` tables).
 * The read/store/freshness logic — Drizzle queries against {@link getDb} — is
 * wired in prompt 02 once DATABASE_URL exists. Reads hit the cache before any
 * gov call; writes are idempotent upserts keyed on the deal's stable hash.
 */

/** Deals we already have cached for this block. */
export async function getCachedDeals(_gush: number): Promise<Deal[]> {
  throw new Error("not implemented — Neon cache is wired in prompt 02");
}

/** Idempotent upsert of freshly-fetched deals + bump the gush's freshness. */
export async function storeDeals(_gush: number, _deals: Deal[]): Promise<void> {
  throw new Error("not implemented — Neon cache is wired in prompt 02");
}

/** When we last pulled this gush from gov. `null` = never (cold block). */
export async function getGushFreshness(_gush: number): Promise<Date | null> {
  throw new Error("not implemented — Neon cache is wired in prompt 02");
}
