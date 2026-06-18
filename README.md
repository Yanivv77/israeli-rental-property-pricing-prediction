# Israeli Real-Estate Valuation

Type an address → the app geocodes it to **gush/helka**, pulls recent transactions
for that block, computes statistics deterministically, and an LLM writes a human
Hebrew explanation, with charts. Government servers are slow and rate-limited, so
fetched deals are cached per-gush in our own Postgres ("the fridge") and served
cache-first.

> The LLM handles *language*. Deterministic code handles *numbers*. They never mix.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the layers, folder layout, and rules,
and [`STACK.md`](./STACK.md) for the exact pinned versions. **Read both before writing code.**

## Stack

Next.js (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Recharts · Neon Postgres + Drizzle · Zod · Gemini · govmap + nadlan · **pnpm only**

## Getting started

```bash
cp .env.example .env.local   # fill in DATABASE_URL + GEMINI_API_KEY
pnpm install
pnpm db:push                  # create the fridge tables (deals, gush_sync, geo_cache)
pnpm dev
```

Open <http://localhost:3000> — `/` is the address + property form; submit to get the
report at `/report` (estimated value, comparables, ₪/m² charts, and a Hebrew explanation).

### The flow

`address` → **geocode** (govmap autocomplete) → **deals** (govmap `street-deals`, the
nadlan dataset) → **clean** (drop typos/dupes, normalize ₪/m²) → **fridge** (Neon,
cache-first) → **stats** (`lib/stats`, deterministic) → **narrative** (Gemini, language
only) → **report**. A repeat search of the same address is served from Neon with zero
gov calls. The govmap/nadlan endpoints are unofficial — see [`docs/data-sources.md`](./docs/data-sources.md).

## Scripts

- `pnpm dev` — local dev server
- `pnpm build` — production build
- `pnpm lint` — ESLint (flat config)
- `pnpm typecheck` — strict TS check
- `pnpm db:generate` — generate a Drizzle migration into `drizzle/`
- `pnpm db:push` — apply the schema to Neon (needs `DATABASE_URL`)

## Project layout

`app/` routes (thin) · `components/ui/` shadcn primitives · `lib/{geo,deals,cache,stats,ai,db}` the
data/stats/AI layers (server-only) · `types/property.ts` Zod domain types · `drizzle/` generated migrations.
