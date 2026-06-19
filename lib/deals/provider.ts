import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { govFetch } from "@/lib/gov/http";
import { DealSchema, type Deal, type ItmPoint } from "@/types/property";

/**
 * One thin seam per external provider so the source can be swapped later.
 * The deals come from the nadlan transaction dataset, served via govmap's
 * `/real-estate/*` API (direct nadlan.gov.il returns an HTML SPA shell — see
 * docs/data-sources.md). Only this interface leaks outward.
 *
 * govmap has no "deals by gush" call, so the flow is point → building polygon →
 * deal rows; the rows carry `gushNum`, which is how we learn the block.
 */
export interface Block {
  polygonId: string;
  street: string | null;
  houseNum: string | null;
}

export interface DealsProvider {
  /** Cheap: resolve a point to its building polygon (no deal rows yet). */
  resolveBlock(point: ItmPoint, houseNumber?: string): Promise<Block | null>;
  /** Expensive: the actual transactions for a polygon, cleaned + validated. */
  fetchDeals(polygonId: string, yearsBack: number): Promise<Deal[]>;
}

// --- boundary schemas (only the fields we use) -------------------------------

const RadiusSchema = z.array(
  z.object({
    dealscount: z.coerce.number().default(0),
    streetNameHeb: z.string().nullish(),
    houseNum: z.string().nullish(),
    polygon_id: z.coerce.string(),
  }),
);

const RawDealSchema = z.object({
  dealId: z.coerce.string().nullish(),
  streetNameHeb: z.string().nullish(),
  houseNum: z.coerce.string().nullish(),
  floorNo: z.string().nullish(),
  assetArea: z.coerce.number().nullish(),
  dealAmount: z.coerce.number().nullish(),
  assetRoomNum: z.coerce.number().nullish(),
  dealDate: z.string().nullish(),
  gushNum: z.coerce.number().nullish(),
  parcelNum: z.coerce.number().nullish(),
  propertyTypeDescription: z.string().nullish(),
  dealNatureDescription: z.string().nullish(),
});
const StreetDealsSchema = z.object({ data: z.array(z.unknown()).default([]) });

// --- cleaning helpers --------------------------------------------------------

// Hebrew ordinal floors: "קרקע"=0, "ראשונה"=1 … "עשרים ושמונה"=28. Best-effort;
// ponytail: unknown forms (basements, roof, penthouse words) → null, floor is a
// soft signal, not a valuation driver.
const FLOOR_UNIT: Record<string, number> = {
  ראשונה: 1, שנייה: 2, שניה: 2, שלישית: 3, רביעית: 4, חמישית: 5,
  שישית: 6, שביעית: 7, שמינית: 8, תשיעית: 9, עשירית: 10,
};
const FLOOR_CARD: Record<string, number> = {
  אחת: 1, אחד: 1, שתים: 2, שתיים: 2, שלוש: 3, ארבע: 4, חמש: 5,
  שש: 6, שבע: 7, שמונה: 8, תשע: 9,
};
const FLOOR_TEN: Record<string, number> = { עשרה: 10, עשר: 10, עשרים: 20, שלושים: 30 };

function parseHebrewFloor(s: string | null | undefined): number | null {
  if (!s) return null;
  const t = s.trim();
  if (t.includes("קרקע")) return 0;
  if (t in FLOOR_UNIT) return FLOOR_UNIT[t];
  let total = 0;
  let matched = false;
  for (const w of t.split(/\s+/).map((x) => x.replace(/^ו/, ""))) {
    const v = FLOOR_TEN[w] ?? FLOOR_CARD[w] ?? FLOOR_UNIT[w];
    if (v !== undefined) { total += v; matched = true; }
  }
  return matched ? total : null;
}

// Stable hash of the identifying fields → idempotent upsert key AND it collapses
// exact-duplicate rows (identical fields → identical id).
function stableId(parts: (string | number | null | undefined)[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16);
}

// Sanity window for ₪/m² in Israel — anything outside is a typo/fabrication.
const MIN_PPSQM = 3_000;
const MAX_PPSQM = 250_000;

// Keep dwellings only. Shops/offices/warehouses/parking/land/whole-buildings
// price very differently per m² and aren't comparable to an apartment — they're
// what drags a block's ₪/m² far below the residential market. Blocklist (not an
// allowlist) so residential variants (apartment, house, penthouse, cottage) and
// untyped rows are kept; only clearly non-residential is dropped.
const NON_RESIDENTIAL =
  /חנות|משרד|מחסן|מסחר|תעשי|חניה|חנייה|קומבינציה|מגרש|קרקע|בניין|בנין|מלון/;
const isResidential = (type?: string | null, nature?: string | null) =>
  !NON_RESIDENTIAL.test(`${type ?? ""} ${nature ?? ""}`);

export const nadlanDeals: DealsProvider = {
  async resolveBlock(point, houseNumber) {
    for (const radius of [50, 150, 500]) {
      const json = await govFetch(`/real-estate/deals/${point.x},${point.y}/${radius}`);
      const polys = RadiusSchema.parse(json).filter((p) => p.houseNum); // building-level only
      if (polys.length === 0) continue;
      // Prefer the polygon whose house number matches the geocoded address;
      // otherwise the one with the most deals (richest sample).
      const wanted = houseNumber ? parseInt(houseNumber, 10) : NaN;
      const match = polys.find((p) => parseInt(p.houseNum!, 10) === wanted);
      const best = match ?? [...polys].sort((a, b) => b.dealscount - a.dealscount)[0];
      return { polygonId: best.polygon_id, street: best.streetNameHeb ?? null, houseNum: best.houseNum ?? null };
    }
    return null;
  },

  async fetchDeals(polygonId, yearsBack) {
    const json = await govFetch(`/real-estate/street-deals/${polygonId}?limit=50`);
    const { data } = StreetDealsSchema.parse(json);
    const cutoff = Date.now() - yearsBack * 365.25 * 86_400_000;
    const seen = new Set<string>();
    const deals: Deal[] = [];

    for (const row of data) {
      const r = RawDealSchema.safeParse(row);
      if (!r.success) continue; // skip malformed rows, don't fail the batch
      const d = r.data;

      const area = d.assetArea ?? 0;
      const amount = d.dealAmount ?? 0;
      const date = d.dealDate ? new Date(d.dealDate) : null;
      // Cleaning: drop zero/negative area or amount, future dates, out-of-range
      // ₪/m² (typos/fabrications), and anything older than the window.
      if (area <= 0 || amount <= 0) continue;
      const ppsqm = amount / area;
      if (ppsqm < MIN_PPSQM || ppsqm > MAX_PPSQM) continue;
      if (date && (isNaN(+date) || +date > Date.now() || +date < cutoff)) continue;
      if (d.gushNum == null) continue; // gush is the block key — required
      if (!isResidential(d.propertyTypeDescription, d.dealNatureDescription)) continue; // dwellings only

      const id = stableId([d.gushNum, d.parcelNum, d.dealDate, amount, area, d.floorNo]);
      if (seen.has(id)) continue;
      seen.add(id);

      const parsed = DealSchema.safeParse({
        id,
        gush: Math.trunc(d.gushNum),
        helka: d.parcelNum != null ? Math.trunc(d.parcelNum) : null,
        polygonId,
        address: [d.streetNameHeb, d.houseNum].filter(Boolean).join(" ") || null,
        dealDate: date,
        amount: Math.round(amount),
        area,
        rooms: d.assetRoomNum ?? null,
        floor: parseHebrewFloor(d.floorNo),
      });
      if (parsed.success) deals.push(parsed.data);
    }
    return deals;
  },
};
