/**
 * Domain types for the valuation flow, defined as Zod schemas with inferred TS
 * types. Per the hard rules, every external response (gov geocode/deals + the AI
 * narrative) is Zod-validated at the boundary before it reaches a component —
 * untyped JSON never flows inward.
 *
 * These are the *cleaned* domain shapes. The raw gov/AI payload parsers (which
 * coerce strings, drop junk rows, etc.) land alongside the providers in prompts
 * 02/03 and produce values matching these schemas.
 */
import { z } from "zod";

/** What the user typed (Hebrew free-text), optionally split into parts. */
export const AddressSchema = z.object({
  raw: z.string().min(1),
  city: z.string().optional(),
  street: z.string().optional(),
  houseNumber: z.string().optional(),
});
export type Address = z.infer<typeof AddressSchema>;

/** Block / parcel identifiers — the Israeli land registry key. */
export const GushHelkaSchema = z.object({
  gush: z.number().int().positive(),
  helka: z.number().int().positive().nullable(),
  subHelka: z.number().int().nonnegative().nullable().optional(),
});
export type GushHelka = z.infer<typeof GushHelkaSchema>;

/** A point in Israeli Transverse Mercator (EPSG:2039), meters. */
export const ItmPointSchema = z.object({
  x: z.number(), // easting
  y: z.number(), // northing
});
export type ItmPoint = z.infer<typeof ItmPointSchema>;

/** Output of geocoding an address: an ITM point + the resolved gush/helka. */
export const GeoResultSchema = z.object({
  address: AddressSchema,
  point: ItmPointSchema,
  gushHelka: GushHelkaSchema,
});
export type GeoResult = z.infer<typeof GeoResultSchema>;

/** A single cleaned transaction for a block (mirrors the cache row, sans fetchedAt). */
export const DealSchema = z.object({
  id: z.string(), // stable hash of the deal (idempotent upsert key)
  gush: z.number().int(),
  helka: z.number().int().nullable(),
  address: z.string().nullable(),
  dealDate: z.date().nullable(),
  amount: z.number().int().nullable(), // ₪
  area: z.number().nullable(), // m²
  rooms: z.number().nullable(),
  floor: z.number().int().nullable(),
});
export type Deal = z.infer<typeof DealSchema>;

/** The property being valued (the user's subject apartment). */
export const SubjectSchema = z.object({
  address: AddressSchema,
  gushHelka: GushHelkaSchema,
  area: z.number().positive().optional(),
  rooms: z.number().positive().optional(),
  floor: z.number().int().optional(),
});
export type Subject = z.infer<typeof SubjectSchema>;

/** Confidence tier for the valuation, driven by comparable-deal coverage. */
export const ConfidenceSchema = z.enum(["high", "medium", "low", "insufficient"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

/**
 * Deterministic statistics computed from the comparable deals. Every number
 * here is produced in code — the LLM only narrates this object (enforced in 03).
 */
export const ValuationStatsSchema = z.object({
  sampleSize: z.number().int().nonnegative(),
  pricePerSqmMedian: z.number().nullable(),
  pricePerSqmMean: z.number().nullable(),
  pricePerSqmStdDev: z.number().nullable(),
  estimatedValue: z.number().nullable(), // subject area × median ₪/m²
  confidence: ConfidenceSchema,
  comps: z.array(DealSchema), // the deals the stats were computed from
});
export type ValuationStats = z.infer<typeof ValuationStatsSchema>;
