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

/**
 * Output of geocoding: a point + the parsed address. NB: govmap autocomplete
 * returns coords in **EPSG:3857 (Web Mercator)**, not ITM (verified 2026-06-18,
 * see docs/data-sources.md). We keep them in 3857 — govmap's deals endpoints
 * expect 3857 and we render no map, so no reprojection is needed. gush/helka is
 * NOT resolved here: the `entitiesByPoint` layer is dead (HTTP 400), so the
 * block id comes from the deal rows downstream.
 */
export const GeoResultSchema = z.object({
  address: AddressSchema,
  point: ItmPointSchema, // EPSG:3857 despite the type name (kept for compat)
});
export type GeoResult = z.infer<typeof GeoResultSchema>;

/** A geocode candidate offered to the user when the address is ambiguous. */
export type GeoCandidate = { label: string };

/** Geocoding is a trust boundary: success, no match, or needs disambiguation. */
export type GeocodeOutcome =
  | { ok: true; result: GeoResult }
  | { ok: false; reason: "no-match" }
  | { ok: false; reason: "ambiguous"; options: GeoCandidate[] };

/** A single cleaned transaction for a block (mirrors the cache row, sans fetchedAt). */
export const DealSchema = z.object({
  id: z.string(), // stable hash of the deal (idempotent upsert key)
  gush: z.number().int(),
  helka: z.number().int().nullable(),
  polygonId: z.string().nullable(), // govmap building polygon → lets geocode resolve gush from the fridge
  address: z.string().nullable(),
  dealDate: z.date().nullable(),
  amount: z.number().int().nullable(), // ₪
  area: z.number().nullable(), // m²
  rooms: z.number().nullable(),
  floor: z.number().int().nullable(),
});
export type Deal = z.infer<typeof DealSchema>;

/**
 * Building condition/age — a user-set knob the comparable deals can't capture
 * (the sale data has no build year or condition). Applies a transparent
 * adjustment to the estimate; see CONDITION_LABELS for the factor.
 */
export const PropertyConditionSchema = z.enum(["renovated", "standard", "needs_renovation"]);
export type PropertyCondition = z.infer<typeof PropertyConditionSchema>;

/** Hebrew label per condition (the % adjustment itself lives in lib/stats). */
export const CONDITION_LABELS: Record<PropertyCondition, string> = {
  renovated: "משופץ",
  standard: "סטנדרטי",
  needs_renovation: "דורש שיפוץ",
};

/** The property being valued (the user's subject apartment). */
export const SubjectSchema = z.object({
  address: AddressSchema,
  gushHelka: GushHelkaSchema,
  area: z.number().positive().optional(),
  rooms: z.number().positive().optional(),
  floor: z.number().int().optional(),
  askingPrice: z.number().positive().optional(), // ₪ — the price to judge against the computed value
  parking: z.boolean().optional(),
  elevator: z.boolean().optional(),
  condition: PropertyConditionSchema.optional(),
});
export type Subject = z.infer<typeof SubjectSchema>;

/**
 * Raw form/searchParam input (all strings) → coerced + validated at the trust
 * boundary before it becomes a {@link Subject}. The orchestrator owns the geo
 * resolution, so gush/helka are not part of the user input.
 */
const blankToUndef = (v: unknown) => (v === "" || v == null ? undefined : v);
const optPos = z.preprocess(blankToUndef, z.coerce.number().positive().optional());
const optInt = z.preprocess(blankToUndef, z.coerce.number().int().optional());

export const SubjectInputSchema = z.object({
  address: z.string().trim().min(1),
  area: optPos,
  rooms: optPos,
  floor: optInt, // 0 = ground floor, so not "positive"
  askingPrice: optPos,
  parking: z.coerce.boolean().optional(), // only sent when checked → never "false"
  elevator: z.coerce.boolean().optional(),
  condition: z.preprocess(blankToUndef, PropertyConditionSchema.optional()),
});
export type SubjectInput = z.infer<typeof SubjectInputSchema>;

/** Confidence tier for the valuation, driven by comparable-deal coverage. */
export const ConfidenceSchema = z.enum(["high", "medium", "low", "insufficient"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

/**
 * Deterministic statistics computed from the comparable deals. Every number
 * here is produced in code — the LLM only narrates this object (enforced in 03).
 */
export const ValuationStatsSchema = z.object({
  sampleSize: z.number().int().nonnegative(), // comparable deals used
  blockSampleSize: z.number().int().nonnegative(), // all valid deals in the block
  pricePerSqmMedian: z.number().nullable(), // median ₪/m² of the comparables
  pricePerSqmMean: z.number().nullable(),
  pricePerSqmStdDev: z.number().nullable(),
  estimatedValue: z.number().nullable(), // subject area × median ₪/m² × condition factor
  conditionFactor: z.number(), // applied condition adjustment (1 = none)
  askingPrice: z.number().nullable(), // echoed from the subject, for the narrative
  deltaVsEstimate: z.number().nullable(), // asking − estimated (₪); >0 = above fair value
  deltaPct: z.number().nullable(), // delta as a fraction of estimated value
  confidence: ConfidenceSchema,
  comps: z.array(DealSchema), // the deals the stats were computed from
});
export type ValuationStats = z.infer<typeof ValuationStatsSchema>;
