# Israeli Real-Estate Valuation

Type an address → get a **sale valuation** and an **estimated monthly rent**, each
backed by real, visible data and a short Hebrew explanation.

The app geocodes the address to its block (**gush**), pulls recent **sale
transactions** for that block from the government property database, computes the
numbers deterministically, estimates rent from official statistics, and an LLM
writes a plain-Hebrew explanation. Government servers are slow and rate-limited,
so everything is cached in our own Postgres ("the fridge") and served cache-first.

> **The golden rule:** code does all the *numbers*; the LLM does only the *words*.
> Every figure on screen is computed in `lib/`. Gemini is handed the finished
> numbers and is forbidden from doing arithmetic — it only explains them.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the layers and rules, [`STACK.md`](./STACK.md)
for pinned versions, and [`docs/data-sources.md`](./docs/data-sources.md) for the
(unofficial) government endpoints and their caveats.

---

## What you get

A report at `/report` with:

- **Estimated sale value** + a fair / over- / under-priced verdict vs. the asking price.
- **Estimated monthly rent** (CBS area-average, scaled to the apartment's size) + the implied gross yield.
- **Charts** — ₪/m² of block deals over time, and the comparables vs. the subject.
- **A comparables table** — the actual recent deals the numbers came from.
- **A Hebrew explanation** that cites those exact computed numbers.
- Graceful states for *no match*, *ambiguous address*, *no data*, and *service outage*.

---

## How it works

```
address
  → geocode        govmap autocomplete → point (EPSG:3857) + parsed address
  → resolve block  govmap deals-by-radius → building polygon
  → deals          govmap street-deals (the nadlan sale dataset) → raw rows
  → clean          drop typos/dupes, compute ₪/m², parse dates, stable-hash dedupe
  → fridge         Neon, cache-first (gush is read from the deal rows)
  → stats          lib/stats — median/mean ₪/m², comparables, value, delta  (deterministic)
  → rent           lib/rent — CBS area-average by city × size               (deterministic)
  → narrative      Gemini Flash-Lite — explains the numbers in Hebrew        (no math)
  → report         Server Component renders it (no internal HTTP hop)
```

Three "layers" (the project's restaurant metaphor):

- **Waiter** — the web UI (`app/`, the form is the only client component).
- **Chef** — the math (`lib/stats`, `lib/rent`) + the narrative (`lib/ai`).
- **Supplier** — government data (`lib/geo`, `lib/deals`) + the fridge (`lib/cache`, `lib/db`).

### gush/helka

govmap's point→gush endpoint is dead, so the block is read **from the deal rows
themselves** (each carries `gushNum`/`parcelNum`). Coordinates stay in EPSG:3857
(no map is rendered, so no reprojection).

### Rent data

Israel has **no per-property rent registry** (the Tax Authority records sales, not
rent). Rent therefore comes from the **Central Bureau of Statistics (CBS)** area
averages — by city for a 3-room flat, scaled to the subject's size by the national
size ratio. It's a **dated static snapshot** (`lib/rent/cbs.ts`, currently Q1 2025),
shown on the page with its source and period. CBS has no clean API, so refreshing
it is a manual code update each release.

---

## The caches ("the fridge") and freshness

| Cache (Neon table) | Holds | Freshness |
|---|---|---|
| `deals` + `gush_sync` | cleaned sale deals per block | **refetched after 7 days** |
| `geo_cache` | address → point / polygon / gush / city | 180 days (the mapping is permanent) |
| `ai_summary` | the Gemini narrative | **content-addressed** (keyed by a hash of the numbers) |

**Cache-first:** a repeat search of the same address makes **zero government calls
and zero Gemini calls** — both the deals and the explanation come from Neon.

**The narrative can't go stale:** it's stored under a hash of the exact numbers it
describes. When deals refresh and the numbers change, the hash changes, so a fresh
explanation is generated automatically — it always matches what's on screen.

---

## Cost per query

The only marginal cost is the Gemini narrative: ~388 in + ~231 out tokens on
Flash-Lite ≈ **$0.00013** (about one-hundredth of a cent). Government data and CBS
rent are free; Neon/Vercel are rounding error. A **repeat** query costs ~$0 (served
from cache). Fixed costs: Vercel Hobby + Neon free tier = $0/mo until their limits.

---

## Getting started

```bash
cp .env.example .env.local    # fill in DATABASE_URL (Neon) + GEMINI_API_KEY (Google AI Studio)
pnpm install
pnpm db:push                  # create the fridge tables
pnpm dev                      # http://localhost:3000
```

Optional env: `GEMINI_MODEL` (defaults to `gemini-flash-lite-latest`), `GOVMAP_BASE_URL`.

## Scripts

| Command | Does |
|---|---|
| `pnpm dev` | local dev server |
| `pnpm build` | production build |
| `pnpm lint` | ESLint (flat config) |
| `pnpm typecheck` | strict TS check |
| `pnpm db:generate` | generate a Drizzle migration into `drizzle/` |
| `pnpm db:push` | apply the schema to Neon (needs `DATABASE_URL`) |

> Smoke/E2E scripts live under `scripts/smoke/` and are **gitignored** (no committed tests).

## Deploy (Vercel)

```bash
export VERCEL_TOKEN=...                       # or add to .env.local
vercel deploy --token "$VERCEL_TOKEN" -y      # preview
vercel deploy --prod --token "$VERCEL_TOKEN" -y   # production
```

Set `DATABASE_URL` and `GEMINI_API_KEY` in the Vercel project (Production + Preview).
The data/AI layer runs on the Node runtime.

---

## Project layout

```
app/                      routes (thin); page.tsx = form, report/page.tsx = report
components/
  valuation-form.tsx      the only client component (address + property inputs)
  charts/                 Recharts trend + comparables (loaded client-side)
lib/
  geo/        govmap geocoding (autocomplete → point + address)
  deals/      govmap street-deals adapter + cleaning
  gov/http.ts shared throttle + retry for all government calls
  cache/      cache-first fridge (deals, geo, AI summary) — the only place deals are written
  stats/      computeStats — deterministic sale valuation
  rent/       CBS area-average rent — deterministic
  ai/         Gemini narrative (explains numbers; cached; never computes)
  valuate.ts  the orchestrator: address → typed report
  db/         Drizzle schema + Neon connection
types/property.ts          Zod domain types
drizzle/                   generated SQL migrations (committed)
```

**Hard rules:** server-only data/AI layer · Zod at every external boundary · the LLM
never produces a number · Drizzle is for our Neon cache only · RTL/Hebrew logical
CSS properties only · pnpm only. Full list in [`ARCHITECTURE.md`](./ARCHITECTURE.md).
