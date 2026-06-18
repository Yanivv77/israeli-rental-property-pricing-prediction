# Project Architecture & Conventions

> **Read this file before generating, editing, or refactoring any code in this repository.** It defines the stack, folder structure, and rules every contribution must follow. If a request conflicts with this document, surface the conflict before proceeding.

---

## 1. Project Overview

Real-estate valuation for the Israeli market. A user types an address → the app
geocodes it to **gush/helka**, pulls recent transactions for that block, computes
statistics deterministically, and an LLM writes a human Hebrew explanation, with
charts. Government servers are slow and rate-limited, so fetched deals are cached
per-gush in our own Postgres ("the fridge") and served **cache-first**.

**Core principle:** The LLM handles *language*. Deterministic code handles *numbers*. They never mix.

### Three layers
- **Frontend (the waiter):** Next.js UI — address in, report + charts out.
- **Backend (the chef):** deterministic stats + a Gemini narrative.
- **Data engine (the supplier):** govmap geocode + nadlan deals + cleaning + cache.

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router) | Server Components by default |
| Language | TypeScript (strict) | `@/*` path alias |
| UI | React | Client Components only when interactivity requires it |
| Styling | Tailwind CSS v4 | CSS-first config via `@theme` in `globals.css` — **no `tailwind.config.js`** |
| Components | shadcn/ui | Installed via CLI into `components/ui/` |
| Charts | Recharts | report visualizations |
| Fonts | `next/font/google` — Heebo | Hebrew-optimized, exposed as `--font-heebo` |
| Cache DB | Neon Postgres + Drizzle | **OUR cache only** ("the fridge") — never a wrapper over gov APIs |
| Validation | Zod | shared client + server; validates every external response at the boundary |
| AI | `@google/genai`, Gemini 3.1 | narrative only — the model never computes a number |
| Geocoding | govmap | address → ITM point + gush/helka |
| Deals | nadlan | recent transactions per gush |
| Dataset discovery | data-gov-il MCP (`.mcp.json`) | **dev-time only**, never a runtime dependency |
| Package manager | **pnpm only** | pinned via `packageManager` |
| Hosting | Vercel (app) + Neon (db) | |

See [`STACK.md`](./STACK.md) for exact pinned versions.

---

## 3. Hard Rules (Non-Negotiable)

1. **Server-only data/AI layer.** Files under `lib/geo`, `lib/deals`, `lib/cache`, `lib/db`, `lib/ai` start with `import 'server-only'`. Never call gov APIs or Gemini from the client.
2. **Zod at every external boundary.** Gov + AI responses are Zod-validated before they reach a component. Untyped JSON never flows inward.
3. **No internal API hops for your own Server Components.** Call the data layer directly. A route handler or Server Action is only for client-triggered work.
4. **One thin interface per external provider** (`GeocodeProvider`, `DealsProvider`) so the source can be swapped later. That seam is allowed; a generic "data abstraction layer" is not.
5. **Drizzle is for OUR Neon cache only.** Never build an ORM/wrapper over the gov APIs.
6. **The LLM never does math.** All valuation numbers come from `lib/stats/`. Gemini only narrates them.
7. **Node runtime** for anything touching the DB or Gemini.
8. **Boring, working code** over clever abstractions.
9. **Do not commit test files.** Smoke scripts stay gitignored unless told otherwise.
10. **pnpm only.**

---

## 4. RTL / Hebrew Rules (Non-Negotiable)

1. `<html dir="rtl" lang="he">` on the root.
2. **Never** use physical directional Tailwind classes: `ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `text-left`, `text-right`, `border-l-*`, `border-r-*`, `rounded-l-*`, `rounded-r-*`.
3. **Always** use logical equivalents: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`, `border-s-*`, `border-e-*`, `rounded-s-*`, `rounded-e-*`.
4. Numbers, currency (₪), and English brand names render LTR inside RTL flow — wrap them in `<bdi>` when needed.
5. Heebo is loaded via `next/font/google` in `app/layout.tsx` and applied as the default body font.

If you catch yourself writing `ml-4`, stop and use `ms-4`.

---

## 5. Folder Structure

```
.
├── app/                          # Next.js App Router — routes only, thin
│   ├── layout.tsx                # dir="rtl", Heebo font
│   ├── page.tsx                  # address input (Server Component)
│   ├── report/page.tsx           # report view
│   ├── globals.css               # Tailwind v4 @theme config + shadcn tokens
│   └── api/                      # route handlers — only for client-triggered work
│
├── components/
│   └── ui/                       # shadcn/ui primitives — added via CLI, DO NOT EDIT
│
├── lib/                          # business logic, server-side
│   ├── geo/provider.ts           # GeocodeProvider interface + govmap impl
│   ├── deals/provider.ts         # DealsProvider interface + nadlan impl
│   ├── cache/deals-cache.ts      # cache-first read/store (Drizzle)
│   ├── stats/valuation.ts        # computeStats(deals, subject) — PURE, deterministic
│   ├── ai/summary.ts             # generateSummary(stats, subject) — Gemini narrative
│   ├── db/
│   │   ├── schema.ts             # Drizzle: deals cache + gush freshness
│   │   └── index.ts              # Neon connection (lazy, reads DATABASE_URL)
│   └── utils/cn.ts               # className merge
│
├── types/property.ts             # Address, GushHelka, GeoResult, Deal, Subject, ValuationStats (Zod + inferred)
├── drizzle/                      # generated SQL migrations (committed)
├── drizzle.config.ts
├── .mcp.json                     # data-gov-il MCP (dev-time dataset discovery)
├── .env.example
└── pnpm-workspace.yaml           # pnpm build-script allowlist
```

---

## 6. Dependency Direction (Strict)

```
app/  →  components/  →  lib/
                              ↑
                        nothing in lib/ imports from app/ or components/
```

- `lib/` is the portable core.
- `lib/stats/` is **pure** — no DB calls, no fetch, no `process.env`. Same inputs → same outputs. It is the *only* place fair-value numbers are produced.
- `lib/geo/`, `lib/deals/`, `lib/cache/`, `lib/db/`, `lib/ai/` are the only places that perform I/O, and they are all `server-only`.

---

## 7. Module Responsibilities

### Data engine (the supplier)
- `lib/geo/provider.ts` — `GeocodeProvider` seam; `govmapGeocoder` resolves an address to an ITM point + gush/helka.
- `lib/deals/provider.ts` — `DealsProvider` seam; `nadlanDeals` fetches recent transactions for a gush.
- `lib/cache/deals-cache.ts` — cache-first reads against the fridge; idempotent upserts keyed on each deal's stable hash; per-gush freshness.
- Every gov response is Zod-validated and cleaned before it is cached or returned.
- **Endpoints, CRS gotchas, rate limits, and ToS constraints are documented in [`docs/data-sources.md`](./docs/data-sources.md)** — prompt 03 must respect them (throttle, cache-first, no raw-data redistribution).

### Backend (the chef)
- `lib/stats/valuation.ts` — `computeStats(deals, subject)` produces `ValuationStats` deterministically.
- `lib/ai/summary.ts` — `generateSummary(stats, subject)` asks Gemini for a Hebrew explanation **of the already-computed numbers**. The model never computes, never picks comps, never does arithmetic that affects output.

### Frontend (the waiter)
- `app/page.tsx` collects the address; `app/report/page.tsx` renders the result.
- Server Components call the data/stats/AI layer **directly** — no internal `fetch` to our own API. A Server Action / route handler is added only when the client triggers work.

### `lib/db/`
- `schema.ts` defines the `deals` cache + `gush_sync` freshness tables. Migrations are generated by `drizzle-kit` into `drizzle/`.
- `index.ts` exports a lazy `getDb()` over the Neon HTTP driver. Node runtime.

---

## 8. Coding Conventions

- **TypeScript strict mode.** No `any` unless justified in a comment.
- **Server Components by default.** Add `"use client"` only when the file needs hooks, event handlers, or browser APIs.
- **Server Actions / route handlers** only for client-triggered work, never for a Server Component to reach its own data layer.
- **Zod at every trust boundary**: form submissions, action inputs, and every external (gov + AI) response.
- **No `console.log`** in committed code.
- **Naming**: kebab-case for files, PascalCase for components and types, camelCase for functions and variables.
- **Imports**: absolute via the `@/` alias.

---

## 9. The Cache ("the fridge")

- Reads are **cache-first**: check the fridge before any gov call.
- `deals.id` is a stable hash of the deal so upserts are idempotent.
- `gush_sync.synced_at` records when a block was last pulled from gov; a stale or missing row triggers a refresh.
- The fridge is **not** a mirror of the gov API surface — it stores only the cleaned `Deal` shape we serve.

---

## 10. Anti-Patterns to Reject

- LLM calls inside `lib/stats/` (or letting the LLM produce any number).
- Building an ORM/wrapper over the gov APIs (Drizzle is for the Neon cache only).
- A Server Component calling our own `app/api/*` instead of the data layer directly.
- Letting an untyped gov/AI payload reach a component (validate with Zod first).
- Calling gov APIs or Gemini from a Client Component.
- Committing test files or smoke scripts.
- Adding a `tailwind.config.js` (Tailwind v4 is CSS-first).
- Using `npm`/`yarn`, or `ml-*` / `mr-*` / `pl-*` / `pr-*` / `text-left` / `text-right` anywhere.

---

## 11. When in Doubt

Default to: **simpler, more local, more typed, more pure, cache-first.** If a change would blur a provider seam or move a number out of `lib/stats/`, push back and propose an alternative that preserves the boundary.
