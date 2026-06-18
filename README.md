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
cp .env.example .env.local   # fill in DATABASE_URL + GEMINI_API_KEY (prompt 02)
pnpm install
pnpm dev
```

Open <http://localhost:3000> — `/` is the address input, `/report` the placeholder report.

> This is the **prompt 01** skeleton: every external seam is a typed stub that throws
> clearly when called. No real gov/AI/DB calls happen yet — those arrive in prompts 02/03.

## Scripts

- `pnpm dev` — local dev server
- `pnpm build` — production build
- `pnpm lint` — ESLint (flat config)
- `pnpm typecheck` — strict TS check
- `pnpm db:generate` — generate a Drizzle migration into `drizzle/`
- `pnpm db:migrate` — apply migrations (needs `DATABASE_URL`, prompt 02)

## Project layout

`app/` routes (thin) · `components/ui/` shadcn primitives · `lib/{geo,deals,cache,stats,ai,db}` the
data/stats/AI layers (server-only) · `types/property.ts` Zod domain types · `drizzle/` generated migrations.
