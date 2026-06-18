import "server-only";
import { z } from "zod";
import { govFetch } from "@/lib/gov/http";
import type { Address, GeocodeOutcome } from "@/types/property";

/**
 * One thin seam per external provider so the source can be swapped later.
 * govmap is the default geocoder; the interface is the only thing the rest of
 * the app depends on.
 */
export interface GeocodeProvider {
  // address (Hebrew free-text) → EPSG:3857 point + parsed address, or a typed
  // "needs disambiguation" / "no match" rather than a guess.
  geocode(address: string): Promise<GeocodeOutcome>;
}

// Boundary validation: only the fields we rely on, the rest is ignored.
const AutocompleteSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.string().optional(),
        text: z.string(),
        type: z.string().optional(),
        score: z.number().optional(),
        shape: z.string().optional(),
      }),
    )
    .default([]),
});

const POINT_RE = /POINT\(([-\d.]+)\s+([-\d.]+)\)/;

// govmap `id` is pipe-delimited, e.g. "address|ADDR|537|דיזנגוף|50|תל אביב".
function parseAddress(raw: string, id: string | undefined, text: string): Address {
  const p = id?.split("|") ?? [];
  return {
    raw,
    street: p[3] || undefined,
    houseNumber: p[4] || undefined,
    city: p[5] || text.split(/\s+/).slice(-1)[0] || undefined,
  };
}

export const govmapGeocoder: GeocodeProvider = {
  async geocode(raw) {
    const query = raw.trim();
    const json = await govFetch("/search-service/autocomplete", {
      method: "POST",
      body: { searchText: query, language: "he", isAccurate: false, maxResults: 10 },
    });
    const { results } = AutocompleteSchema.parse(json);

    // Only precise street-address hits carry a usable point.
    const addrs = results
      .filter((r) => r.type === "address" && POINT_RE.test(r.shape ?? ""))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    if (addrs.length === 0) {
      // Street/settlement-level hits but no exact address → ask for a house number.
      const coarse = results.filter((r) => r.type !== "address").slice(0, 5);
      return coarse.length
        ? { ok: false, reason: "ambiguous", options: coarse.map((r) => ({ label: r.text })) }
        : { ok: false, reason: "no-match" };
    }

    const [top, second] = addrs;
    const dominant =
      !second || (top.score ?? 0) >= (second.score ?? 0) * 1.5 || top.text === query;
    if (!dominant) {
      return {
        ok: false,
        reason: "ambiguous",
        options: addrs.slice(0, 5).map((r) => ({ label: r.text })),
      };
    }

    const m = POINT_RE.exec(top.shape!)!;
    return {
      ok: true,
      result: {
        address: parseAddress(query, top.id, top.text),
        point: { x: Number(m[1]), y: Number(m[2]) }, // EPSG:3857
      },
    };
  },
};
