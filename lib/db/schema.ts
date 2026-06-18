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
    address: text("address"),
    dealDate: timestamp("deal_date"),
    amount: integer("amount"), // ₪
    area: real("area"), // m²
    rooms: real("rooms"),
    floor: integer("floor"),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (t) => [index("deals_gush_idx").on(t.gush)],
);

// freshness per block: when did we last pull this gush from gov?
export const gushSync = pgTable("gush_sync", {
  gush: integer("gush").primaryKey(),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});

export type DealRow = typeof deals.$inferSelect;
export type NewDealRow = typeof deals.$inferInsert;
export type GushSyncRow = typeof gushSync.$inferSelect;
