import "server-only";
import type { Subject, ValuationStats } from "@/types/property";

/**
 * Gemini writes a human Hebrew explanation of the already-computed numbers.
 * The model only narrates `stats` — it never computes or alters a value, and
 * never decides which deals are relevant (enforced in prompt 03). Node runtime.
 */
export async function generateSummary(
  _stats: ValuationStats,
  _subject: Subject,
): Promise<string> {
  throw new Error("not implemented — Gemini narrative is wired in prompt 03");
}
