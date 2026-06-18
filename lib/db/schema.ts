import {
  pgTable,
  text,
  integer,
  real,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

/**
 * OUR Neon cache ("the fridge") — NOT a wrapper over the gov APIs. Gov servers
 * are slow and rate-limited, so deals fetched per-gush are stored here and
 * served cache-first.
 */
export const deals = pgTable(
  "deals",
  {
    id: text("id").primaryKey(), // stable hash of the deal (idempotent upsert)
    gush: integer("gush").notNull(),
    helka: integer("helka"),
    polygonId: text("polygon_id"), // govmap building polygon → resolve gush from cache, skip a gov call
    address: text("address"),
    dealDate: timestamp("deal_date"),
    amount: integer("amount"), // ₪
    area: real("area"), // m²
    rooms: real("rooms"),
    floor: integer("floor"),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (t) => [
    index("deals_gush_idx").on(t.gush),
    index("deals_polygon_idx").on(t.polygonId),
  ],
);

// freshness per block: when did we last pull this gush from gov?
export const gushSync = pgTable("gush_sync", {
  gush: integer("gush").primaryKey(),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});

/**
 * Address → resolved location cache. A gush mapping is permanent, so a repeat
 * search of the same address resolves point/polygon/gush from here with ZERO
 * gov calls (no geocode, no polygon lookup) — the "instant repeat search".
 */
export const geoCache = pgTable("geo_cache", {
  addr: text("addr").primaryKey(), // normalized address string
  x: real("x").notNull(), // EPSG:3857 point
  y: real("y").notNull(),
  polygonId: text("polygon_id"),
  gush: integer("gush"),
  helka: integer("helka"),
  city: text("city"), // parsed city → CBS rent lookup survives a cache hit
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});

/**
 * Cached Gemini narratives, content-addressed: the key is a hash of the exact
 * prompt (model + system + computed numbers). The narrative is deterministic
 * (temp 0), so an identical query reuses the text and makes ZERO LLM calls.
 */
export const aiSummary = pgTable("ai_summary", {
  id: text("id").primaryKey(), // hash of the full prompt
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DealRow = typeof deals.$inferSelect;
export type NewDealRow = typeof deals.$inferInsert;
export type GushSyncRow = typeof gushSync.$inferSelect;
