import "server-only";
import { and, desc, eq, gte } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { govmapGeocoder } from "@/lib/geo/provider";
import { nadlanDeals as provider } from "@/lib/deals/provider";
import type { Address, Deal, GeoCandidate, ItmPoint } from "@/types/property";

/**
 * The cache-first gateway to all gov data ("the fridge"): geocode → block →
 * deals, every step served from Neon before any gov call. This is the ONLY
 * place deals are written.
 *
 * Two caches compound so a repeat search of the same address makes ZERO gov
 * calls: `geo_cache` maps the address → point/polygon/gush (permanent), and
 * `gush_sync` + `deals` hold the block's transactions (7-day TTL).
 */
const DEALS_TTL_MS = 7 * 86_400_000; // refetch deals after a week
const GEO_TTL_MS = 180 * 86_400_000; // re-geocode occasionally to self-heal

export type Resolution =
  | {
      kind: "ok";
      address: Address;
      gush: number;
      helka: number | null;
      deals: Deal[];
      source: "cache" | "gov";
    }
  | { kind: "no-match" }
  | { kind: "ambiguous"; options: GeoCandidate[] }
  | { kind: "no-data"; address: Address };

const { deals, gushSync, geoCache, aiSummary } = schema;

/** Cached Gemini narrative for an exact prompt hash, or null on a miss. */
export async function getCachedSummary(key: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ summary: aiSummary.summary })
    .from(aiSummary)
    .where(eq(aiSummary.id, key))
    .limit(1);
  return row?.summary ?? null;
}

/** Store a narrative under its prompt hash (idempotent). */
export async function storeSummary(key: string, summary: string): Promise<void> {
  await getDb()
    .insert(aiSummary)
    .values({ id: key, summary })
    .onConflictDoNothing({ target: aiSummary.id });
}

const norm = (s: string) => s.trim().replace(/\s+/g, " ");

function rowToDeal(r: typeof deals.$inferSelect): Deal {
  const { fetchedAt: _drop, ...d } = r;
  return d;
}

const mode = (xs: number[]): number =>
  [...xs].sort(
    (a, b) => xs.filter((x) => x === b).length - xs.filter((x) => x === a).length,
  )[0];

async function gushFresh(gush: number): Promise<boolean> {
  const [row] = await getDb()
    .select({ syncedAt: gushSync.syncedAt })
    .from(gushSync)
    .where(eq(gushSync.gush, gush))
    .limit(1);
  return !!row && Date.now() - row.syncedAt.getTime() < DEALS_TTL_MS;
}

async function cachedDeals(gush: number, yearsBack: number): Promise<Deal[]> {
  const cutoff = new Date(Date.now() - yearsBack * 365.25 * 86_400_000);
  const rows = await getDb()
    .select()
    .from(deals)
    .where(and(eq(deals.gush, gush), gte(deals.dealDate, cutoff)))
    .orderBy(desc(deals.dealDate));
  return rows.map(rowToDeal);
}

async function fetchStoreDeals(
  polygonId: string,
  yearsBack: number,
): Promise<{ deals: Deal[]; gush: number; helka: number | null } | null> {
  const fresh = await provider.fetchDeals(polygonId, yearsBack);
  if (fresh.length === 0) return null;
  const gush = mode(fresh.map((d) => d.gush));
  const blockDeals = fresh.filter((d) => d.gush === gush);
  const helka = blockDeals.map((d) => d.helka).find((h) => h != null) ?? null;

  const db = getDb();
  // Idempotent: id is a content hash, so a re-seen deal is a no-op.
  await db.insert(deals).values(fresh).onConflictDoNothing({ target: deals.id });
  await db
    .insert(gushSync)
    .values({ gush, syncedAt: new Date() })
    .onConflictDoUpdate({ target: gushSync.gush, set: { syncedAt: new Date() } });
  return { deals: blockDeals, gush, helka };
}

/** Address → cached valuation data, cache-first end to end. */
export async function resolveValuation(
  rawAddress: string,
  yearsBack = 2,
): Promise<Resolution> {
  const db = getDb();
  const key = norm(rawAddress);

  // 1) Address cache — a hit means no geocode and no polygon lookup.
  const [geo] = await db.select().from(geoCache).where(eq(geoCache.addr, key)).limit(1);

  let address: Address;
  let point: ItmPoint;
  let polygonId: string | null;
  let gush: number | null;
  let helka: number | null;

  if (geo && Date.now() - geo.syncedAt.getTime() < GEO_TTL_MS) {
    address = { raw: rawAddress, city: geo.city ?? undefined }; // city → CBS rent
    point = { x: geo.x, y: geo.y };
    polygonId = geo.polygonId;
    gush = geo.gush;
    helka = geo.helka;
  } else {
    const g = await govmapGeocoder.geocode(rawAddress);
    if (!g.ok) {
      return g.reason === "ambiguous" ? { kind: "ambiguous", options: g.options } : { kind: "no-match" };
    }
    address = g.result.address;
    point = g.result.point;
    const block = await provider.resolveBlock(point, address.houseNumber);
    if (!block) return { kind: "no-data", address };
    polygonId = block.polygonId;
    // Maybe this building is already in the fridge → learn its gush with no fetch.
    const [k] = await db
      .select({ gush: deals.gush, helka: deals.helka })
      .from(deals)
      .where(eq(deals.polygonId, polygonId))
      .limit(1);
    gush = k?.gush ?? null;
    helka = k?.helka ?? null;
  }

  // 2) Deals cache-first by gush.
  let out: Deal[] = [];
  let source: "cache" | "gov" = "cache";
  if (gush != null && (await gushFresh(gush))) {
    out = await cachedDeals(gush, yearsBack);
  }

  // 3) Cold/stale → fetch (needs the polygon), with stale-cache fallback on outage.
  if (out.length === 0) {
    if (!polygonId) return { kind: "no-data", address };
    let fetched: Awaited<ReturnType<typeof fetchStoreDeals>>;
    try {
      fetched = await fetchStoreDeals(polygonId, yearsBack);
    } catch (err) {
      if (gush != null) {
        const stale = await cachedDeals(gush, yearsBack); // stale-but-useful
        if (stale.length) return { kind: "ok", address, gush, helka, deals: stale, source: "cache" };
      }
      throw err; // orchestrator maps to a clean error state
    }
    if (!fetched) return { kind: "no-data", address };
    out = fetched.deals;
    gush = fetched.gush;
    helka = fetched.helka;
    source = "gov";
  }

  // 4) Remember the resolution so the next identical search is zero gov calls.
  const geoRow = { x: point.x, y: point.y, polygonId, gush, helka, city: address.city ?? null, syncedAt: new Date() };
  await db
    .insert(geoCache)
    .values({ addr: key, ...geoRow })
    .onConflictDoUpdate({ target: geoCache.addr, set: geoRow });

  return { kind: "ok", address, gush: gush!, helka, deals: out, source };
}
