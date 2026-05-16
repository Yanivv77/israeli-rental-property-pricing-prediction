# Israeli Rental Property Pricing Prediction

AI-driven rent valuation platform for the Israeli market. Users enter apartment details and receive a fair market value, confidence tier, and a short Hebrew negotiation summary.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the stack, folder layout, and contribution rules, and [`STACK.md`](./STACK.md) for the exact pinned versions. **Read both before writing code.**

## Stack

Next.js (App Router) · TypeScript · Tailwind v4 · shadcn/ui · PostgreSQL + PostGIS · Gemini · Google Places

## Getting started

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run typecheck` — strict TS check
- `npm run lint` — Next.js lint
