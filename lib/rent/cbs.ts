import type { Subject } from "@/types/property";

/**
 * CBS area-average rent — the rent data source. Israel has no per-property rent
 * registry (unlike Tax-Authority sale deals), so rent comes from the Central
 * Bureau of Statistics' published averages: nationally by dwelling size, and by
 * city for a 3-room dwelling. Official, dated figures, shown with their source
 * so the rent number stays fully traceable. Deterministic — like lib/stats, no
 * LLM and no I/O.
 *
 * Source: cbs.gov.il — "מדדים ומחירים ממוצעים של שכר דירה", רבעון 1, 2025.
 * (Static dated snapshot: rent averages move quarterly; refresh on CBS release.)
 */
export const CBS_RENT = {
  period: "רבעון 1, 2025",
  sourceLabel: 'הלמ"ס — מחירים ממוצעים של שכר דירה',
  sourceUrl:
    "https://www.cbs.gov.il/he/subjects/Pages/מחירים-ממוצעים-של-שכר-דירה.aspx",
  nationalAvg: 4853,
} as const;

// National average monthly rent (₪) by dwelling-size group.
export const RENT_BY_SIZE = [
  { group: "1–2", rent: 3706 },
  { group: "2.5–3", rent: 4323 },
  { group: "3.5–4", rent: 5286 },
  { group: "4.5–6", rent: 6815 },
] as const;
const REF_3ROOM = 4323; // size group the by-city (3-room) figures correspond to

// Average monthly rent (₪) for a 3-room dwelling, by city.
const CITY_3ROOM: Record<string, number> = {
  "תל אביב": 6963,
  "תל אביב-יפו": 6963,
  ירושלים: 4641,
  הרצליה: 5347,
  "רמת גן": 5281,
  חיפה: 3019,
  "באר שבע": 2716,
  "באר-שבע": 2716,
  "בית שמש": 3748,
};

export type RentEstimate = {
  monthly: number; // estimated monthly rent ₪
  basis: "city" | "national"; // whether a city match refined the figure
  city: string | null; // matched CBS city (null → national fallback)
  cityRent3room: number | null; // the city's CBS 3-room average, if matched
  sizeGroup: string; // matched dwelling-size group
};

function sizeIndex(rooms: number | undefined): number {
  if (rooms == null) return 1; // default to the 2.5–3 group
  if (rooms < 2.5) return 0;
  if (rooms < 3.5) return 1;
  if (rooms < 4.5) return 2;
  return 3;
}

/**
 * Estimate monthly rent from CBS averages: a city's 3-room average scaled to the
 * subject's size by the national size ratio, or the national size average when
 * the city isn't in CBS's city list.
 */
export function estimateRent(subject: Subject): RentEstimate {
  const size = RENT_BY_SIZE[sizeIndex(subject.rooms)];
  const cityKey = subject.address.city?.trim();
  const cityRent = cityKey ? CITY_3ROOM[cityKey] : undefined;
  if (cityRent != null) {
    return {
      monthly: Math.round((cityRent * size.rent) / REF_3ROOM),
      basis: "city",
      city: cityKey!,
      cityRent3room: cityRent,
      sizeGroup: size.group,
    };
  }
  return {
    monthly: size.rent,
    basis: "national",
    city: null,
    cityRent3room: null,
    sizeGroup: size.group,
  };
}
