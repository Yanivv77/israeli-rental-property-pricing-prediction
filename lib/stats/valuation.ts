import type { Deal, Subject, ValuationStats } from "@/types/property";

/**
 * Deterministic valuation statistics. Pure function: same inputs → same
 * outputs, no I/O. This is the ONLY place fair-value numbers are produced — the
 * LLM never does math (enforced in prompt 03). Real arithmetic lands in 03.
 */
export function computeStats(_deals: Deal[], _subject: Subject): ValuationStats {
  throw new Error("not implemented — deterministic stats land in prompt 03");
}
