import "server-only";
import { resolveValuation } from "@/lib/cache/deals-cache";
import { computeStats } from "@/lib/stats/valuation";
import { estimateRent, type RentEstimate } from "@/lib/rent/cbs";
import { generateSummary } from "@/lib/ai/summary";
import {
  SubjectInputSchema,
  type Deal,
  type GeoCandidate,
  type Subject,
  type SubjectInput,
  type ValuationStats,
} from "@/types/property";

/**
 * The whole flow, server-side, in one call: geocode → cache-first deals →
 * deterministic stats → Gemini narrative. Called DIRECTLY by the /report
 * Server Component — no internal HTTP hop, no client→gov calls. Every outcome
 * is a typed state so the UI never sees a raw gov/AI error.
 */
export type Report =
  | {
      status: "ok";
      subject: Subject;
      stats: ValuationStats;
      rent: RentEstimate;
      deals: Deal[];
      summary: string;
      source: "cache" | "gov";
    }
  | { status: "ambiguous"; options: GeoCandidate[] }
  | { status: "no-match" }
  | { status: "no-data"; address: string }
  | { status: "error"; message: string };

const nis = (n: number | null) =>
  n == null ? "—" : "₪" + new Intl.NumberFormat("he-IL").format(n);

// Deterministic Hebrew fallback so a Gemini outage still ships the numbers.
function fallbackSummary(stats: ValuationStats): string {
  const base = `על בסיס ${stats.sampleSize} עסקאות משוות בגוש, המחיר החציוני הוא ${nis(stats.pricePerSqmMedian)} למ"ר`;
  const est = stats.estimatedValue != null ? `, והשווי המוערך לנכס הוא ${nis(stats.estimatedValue)}` : "";
  return `${base}${est}. (הסבר ה-AI אינו זמין כרגע — המספרים חושבו על ידי המערכת.)`;
}

export async function valuate(input: SubjectInput): Promise<Report> {
  const parsed = SubjectInputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "הקלט שהוזן אינו תקין." };
  const s = parsed.data;

  try {
    const r = await resolveValuation(s.address, 2);
    if (r.kind === "ambiguous") return { status: "ambiguous", options: r.options };
    if (r.kind === "no-match") return { status: "no-match" };
    if (r.kind === "no-data" || r.deals.length === 0) return { status: "no-data", address: s.address };

    const subject: Subject = {
      address: r.address,
      gushHelka: { gush: r.gush, helka: r.helka, subHelka: null },
      area: s.area,
      rooms: s.rooms,
      floor: s.floor,
      askingPrice: s.askingPrice,
      parking: s.parking,
      elevator: s.elevator,
    };

    const stats = computeStats(r.deals, subject);
    const rent = estimateRent(subject); // CBS area-average rent (deterministic)

    let summary: string;
    try {
      summary = await generateSummary(stats, subject, rent);
    } catch {
      summary = fallbackSummary(stats); // AI down → ship the numbers anyway
    }

    return { status: "ok", subject, stats, rent, deals: r.deals, summary, source: r.source };
  } catch {
    return {
      status: "error",
      message: "שירותי המידע הממשלתיים אינם זמינים כרגע. נסו שוב מאוחר יותר.",
    };
  }
}
