# Project Architecture & Conventions

> **Read this file before generating, editing, or refactoring any code in this repository.** It defines the stack, folder structure, and rules that every contribution must follow. If a request conflicts with this document, surface the conflict before proceeding.

---

## 1. Project Overview

An AI-driven rent valuation platform for the Israeli market. A user enters apartment details via a form (with optional paste-to-fill from a listing description). The system returns a fair market value, a confidence tier, and a short Hebrew negotiation summary.

**Core principle:** The LLM handles *language*. Deterministic code handles *numbers*. These never mix.

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (latest stable, App Router) | Server Components by default |
| Language | TypeScript | Strict mode on |
| UI | React (latest stable) | Client Components only when interactivity requires it |
| Styling | Tailwind CSS v4 | CSS-first config via `@theme` in `globals.css` — **no `tailwind.config.js`** |
| Components | shadcn/ui | Installed via CLI into `components/ui/` |
| Fonts | `next/font/google` — Heebo or Assistant | Hebrew-optimized |
| Database | PostgreSQL on Google Cloud SQL | PostGIS extension enabled |
| DB Access | `pg` (node-postgres) | Raw parameterized SQL, no ORM (yet) |
| Validation | Zod | Shared between client and server |
| AI | `@google/genai` SDK, current Gemini Pro model | Two distinct calls: extraction + summary |
| Geocoding | Google Places Autocomplete | Returns place_id + lat/lng |
| Hosting | Vercel (app) + Cloud SQL (db) | Single deploy target |

### Deliberately excluded
- ❌ Firebase Data Connect (raw `pg` is simpler at this scale)
- ❌ MCP (this is a pipeline, not an agent)
- ❌ Any ORM (Prisma fights PostGIS; revisit Drizzle later if surface grows)
- ❌ Server-side URL scraping (use form input + optional paste-text only)
- ❌ NoSQL / Firestore
- ❌ LLM-as-calculator (numbers come from code, not models)
- ❌ Microservices (modular monolith)

---

## 3. RTL / Hebrew Rules (Non-Negotiable)

1. `<html dir="rtl" lang="he">` on the root.
2. **Never** use physical directional Tailwind classes: `ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `text-left`, `text-right`, `border-l-*`, `border-r-*`, `rounded-l-*`, `rounded-r-*`.
3. **Always** use logical equivalents: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`, `border-s-*`, `border-e-*`, `rounded-s-*`, `rounded-e-*`.
4. Numbers, currency (₪), and English brand names render LTR inside RTL flow — wrap them in `<bdi>` when needed.
5. Load Heebo or Assistant via `next/font/google` in `app/layout.tsx`; apply as the default body font.

If you catch yourself writing `ml-4`, stop and use `ms-4`.

---

## 4. Folder Structure

```
.
├── app/                             # Next.js App Router — routes only, thin
│   ├── layout.tsx                   # dir="rtl", font, providers
│   ├── page.tsx                     # search page (Server Component)
│   ├── globals.css                  # Tailwind v4 @theme config
│   ├── (marketing)/                 # static pages route group
│   │   ├── about/page.tsx
│   │   └── privacy/page.tsx
│   ├── valuation/
│   │   ├── page.tsx
│   │   └── loading.tsx              # Suspense fallback
│   └── api/                         # only if REST endpoints are required
│
├── components/
│   ├── ui/                          # shadcn/ui primitives — DO NOT EDIT
│   ├── forms/
│   │   ├── valuation-form.tsx       # main form (Client Component)
│   │   ├── address-autocomplete.tsx # Google Places wrapper
│   │   └── paste-to-fill.tsx        # optional textarea + extract trigger
│   └── results/
│       ├── fair-value-card.tsx
│       ├── comps-list.tsx
│       ├── recommendation.tsx
│       └── confidence-badge.tsx
│
├── lib/                             # business logic, framework-agnostic
│   ├── actions/                     # Next.js Server Actions (API surface)
│   │   ├── valuate.ts               # main orchestration
│   │   ├── extract-listing.ts
│   │   └── submit-contribution.ts
│   │
│   ├── validation/                  # Zod schemas (shared client + server)
│   │   ├── valuation-input.ts
│   │   ├── listing.ts
│   │   └── index.ts
│   │
│   ├── db/
│   │   ├── client.ts                # pg Pool singleton
│   │   ├── queries/                 # one file per domain
│   │   │   ├── listings.ts
│   │   │   └── contributions.ts
│   │   ├── types.ts                 # row types
│   │   └── migrations/              # numbered .sql files
│   │       ├── 001_init.sql
│   │       ├── 002_postgis.sql
│   │       └── 003_listings_table.sql
│   │
│   ├── valuation/                   # PURE FUNCTIONS — no I/O
│   │   ├── hedonic.ts               # regression model
│   │   ├── adjustments.ts           # feature-by-feature price adjustments
│   │   ├── confidence.ts            # confidence tier logic
│   │   └── types.ts
│   │
│   ├── ai/                          # all LLM interactions
│   │   ├── client.ts                # @google/genai init
│   │   ├── extract.ts               # structured output extraction
│   │   ├── summarize.ts             # Hebrew narrative summary
│   │   └── prompts/
│   │       ├── extract-listing.ts
│   │       └── valuation-summary.ts
│   │
│   ├── geo/
│   │   ├── places.ts                # Google Places wrappers
│   │   └── distance.ts
│   │
│   └── utils/
│       ├── cn.ts                    # className merge
│       ├── format-currency.ts       # ₪ formatting
│       └── hebrew.ts
│
├── public/
├── scripts/                         # ops scripts, not in runtime
│   ├── seed-comps.ts
│   └── retrain-model.ts
├── tests/                           # mirrors lib/
│   └── valuation/
│       └── hedonic.test.ts
├── .env.example
├── .env.local                       # gitignored
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## 5. Dependency Direction (Strict)

```
app/  →  components/  →  lib/
                              ↑
                        nothing in lib/ imports from app/ or components/
```

- `lib/` is the portable core. It must be runnable without React or Next.
- `lib/valuation/` is **pure** — no DB calls, no fetch, no `process.env`, no `Date.now()` inside calculation logic (pass time in as a parameter if you need it).
- `lib/ai/` and `lib/db/` are the only places that perform I/O for business logic.
- Server Actions in `lib/actions/` are **thin orchestrators**. They call validation → AI → DB → valuation → AI. No business logic in actions.

---

## 6. Module Responsibilities

### `lib/actions/`
Server Actions are the contract between UI and backend. Each action:
1. Validates input with a Zod schema from `lib/validation/`.
2. Calls into `lib/ai/`, `lib/db/`, `lib/valuation/` in the right order.
3. Returns a typed result or throws a known error.
4. Streams via React Suspense where applicable.

Order of streamed output for the main valuation flow:
1. Parsed/validated inputs (instant feedback)
2. Comps found within radius
3. Fair value number + confidence tier
4. Hebrew negotiation summary

### `lib/validation/`
Zod schemas only. No logic. Import from both client (form validation) and server (action input validation).

### `lib/db/`
- `client.ts` exports a singleton `pg.Pool`.
- `queries/*.ts` exports typed async functions. **All queries use parameterized SQL (`$1`, `$2`, …). Never concatenate user input.**
- PostGIS queries (`ST_DWithin`, etc.) live here.
- Row types in `types.ts` are hand-rolled to match the schema.

Example query signature:
```ts
export async function findCompsWithinRadius(
  lat: number,
  lng: number,
  radiusMeters: number,
  limit: number
): Promise<RentalListing[]>
```

### `lib/valuation/`
Pure deterministic logic. The hedonic regression and feature adjustments live here. Same inputs → same outputs, always. This module produces the fair market value number — **the LLM never does**.

Confidence tiers:
- `high`: ≥10 comps within 500m
- `medium`: 5–9 comps within 500m
- `low`: 3–4 comps within 1km (after radius expansion)
- `insufficient`: <3 comps even after expansion → return without a number

### `lib/ai/`
Two and only two responsibilities:
1. **Extract**: parse pasted listing text into structured fields (Gemini structured output / JSON mode).
2. **Summarize**: turn a computed valuation result into a 2-sentence Hebrew negotiation summary.

Prompts live in `prompts/` as exported template strings or functions. Never inline long prompts in business logic.

The LLM never:
- Computes the fair market value number
- Decides which comps are relevant
- Performs arithmetic that affects the output

### `lib/geo/`
Google Places autocomplete wrappers, coordinate utilities. Place IDs and lat/lng flow through here before reaching the DB.

---

## 7. Coding Conventions

- **TypeScript strict mode.** No `any` unless justified in a comment.
- **Server Components by default.** Add `"use client"` only when the file needs hooks, event handlers, or browser APIs.
- **Server Actions over API routes.** Only create `app/api/*` if you need a public REST endpoint.
- **Zod at every trust boundary**: form submissions, action inputs, external API responses where shape matters.
- **No `console.log` in committed code.** Use a structured logger or remove.
- **Error handling**: actions return discriminated unions (`{ ok: true, data } | { ok: false, error }`) or throw typed errors caught by an error boundary. Pick one pattern and stay consistent.
- **Naming**: kebab-case for files, PascalCase for components and types, camelCase for functions and variables.
- **Imports**: absolute imports via `@/` alias (configured in `tsconfig.json`).

---

## 8. Database Conventions

- Migrations are numbered SQL files in `lib/db/migrations/`. Never edit a past migration; add a new one.
- Every table has `id`, `created_at`, `updated_at`.
- Geographic data uses `geography(Point, 4326)`, not `geometry`.
- All `ST_DWithin` calls use meters (the `geography` type makes this automatic).
- Indexes on geographic columns are GIST.

Example:
```sql
CREATE INDEX listings_location_idx ON rental_listings USING GIST (location);
```

---

## 9. AI Prompt Conventions

- Prompts are versioned. When you change a prompt, increment its version constant.
- Extraction prompts require structured JSON output (Gemini's response schema feature).
- Summary prompts return plain Hebrew text, max 2 sentences.
- Never give the LLM the asking price *before* it sees the comps — that biases the summary.
- Never let the LLM "decide" the fair value. It receives the number from `lib/valuation/` and writes prose around it.

---

## 10. What to Do When Asked to Build Something

1. **Identify the layer.** Is this a route (`app/`), a component (`components/`), business logic (`lib/`), or infrastructure (`scripts/`)?
2. **Check this document for the right folder.** If unsure, ask.
3. **Respect dependency direction.** Lower layers must not import from higher ones.
4. **Add Zod schemas first** if input crosses a trust boundary.
5. **Keep `lib/valuation/` pure.** If a request would add I/O there, refactor: do the I/O in the action, pass values in as arguments.
6. **For database changes**: write a new migration file, update `lib/db/types.ts`, update or add query functions.
7. **For RTL UI**: verify no physical directional classes before finishing.

---

## 11. Anti-Patterns to Reject

- Putting business logic inside React components.
- Calling the database directly from a Server Component (use an action or a `lib/db/queries/` function).
- LLM calls inside `lib/valuation/`.
- String-concatenated SQL.
- Editing files in `components/ui/` (shadcn primitives).
- Adding a `tailwind.config.js` (Tailwind v4 uses CSS-first config).
- Introducing an ORM without discussing the migration plan first.
- Adding microservices, queues, or message brokers without a documented bottleneck that requires them.
- Using `ml-*` / `mr-*` / `pl-*` / `pr-*` / `text-left` / `text-right` anywhere.

---

## 12. When in Doubt

Default to: **simpler, more local, more typed, more pure.**

If a proposed change would make the codebase harder to delete or replace one module without touching others, push back and propose an alternative that preserves the boundary.
