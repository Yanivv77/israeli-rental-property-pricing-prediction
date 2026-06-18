import type { Confidence, Deal, Subject, ValuationStats } from "@/types/property";

/**
 * Deterministic valuation statistics. Pure function: same inputs → same
 * outputs, no I/O. This is the ONLY place fair-value numbers are produced — the
 * LLM never does math. `deals` is the cleaned block sample (all same gush).
 */

const ppsqm = (d: Deal): number | null =>
  d.amount != null && d.amount > 0 && d.area != null && d.area > 0 ? d.amount / d.area : null;

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function meanStd(xs: number[]): { mean: number | null; std: number | null } {
  if (xs.length === 0) return { mean: null, std: null };
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  if (xs.length < 2) return { mean, std: null };
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1);
  return { mean, std: Math.sqrt(variance) };
}

// Comparables: deals closest to the subject by area (and rooms if known).
// Widen the tolerance until we have a usable set; fall back to the whole block.
function selectComps(valid: Deal[], subject: Subject): Deal[] {
  const a = subject.area;
  if (a == null) return valid;
  const near = (areaTol: number, roomTol: number) =>
    valid.filter(
      (d) =>
        d.area != null &&
        Math.abs(d.area - a) / a <= areaTol &&
        (subject.rooms == null ||
          d.rooms == null ||
          Math.abs(d.rooms - subject.rooms) <= roomTol),
    );
  for (const [at, rt] of [[0.2, 0.5], [0.35, 1], [0.5, 1.5]] as const) {
    const c = near(at, rt);
    if (c.length >= 3) return c;
  }
  return valid;
}

function confidenceFor(n: number): Confidence {
  if (n >= 15) return "high";
  if (n >= 8) return "medium";
  if (n >= 3) return "low";
  return "insufficient";
}

export function computeStats(deals: Deal[], subject: Subject): ValuationStats {
  const valid = deals.filter((d) => ppsqm(d) != null);
  const comps = selectComps(valid, subject);

  const compPrices = comps.map(ppsqm).filter((x): x is number => x != null);
  const med = median(compPrices);
  const { mean, std } = meanStd(compPrices);

  const estimatedValue =
    subject.area != null && med != null ? Math.round(subject.area * med) : null;
  const askingPrice = subject.askingPrice ?? null;
  const deltaVsEstimate =
    askingPrice != null && estimatedValue != null ? askingPrice - estimatedValue : null;
  const deltaPct =
    deltaVsEstimate != null && estimatedValue ? deltaVsEstimate / estimatedValue : null;

  return {
    sampleSize: comps.length,
    blockSampleSize: valid.length,
    pricePerSqmMedian: med != null ? Math.round(med) : null,
    pricePerSqmMean: mean != null ? Math.round(mean) : null,
    pricePerSqmStdDev: std != null ? Math.round(std) : null,
    estimatedValue,
    askingPrice,
    deltaVsEstimate,
    deltaPct,
    confidence: confidenceFor(comps.length),
    comps,
  };
}
