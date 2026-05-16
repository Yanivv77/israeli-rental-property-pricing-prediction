# Stack Versions

> **Use the stable versions pinned here.** Do not install `beta`, `rc`, `canary`, `next`, or `insiders` tags. If a package below has a newer major release, update this file *and* `ARCHITECTURE.md` in the same PR — never silently bump.
>
> Last verified: **2026-05-16**

---

## Pinned versions

| Tech | Version | Notes |
|---|---|---|
| Next.js | `^16.2.6` | App Router, Server Components default |
| React | `^19.2.6` | RSC-aware |
| React DOM | `^19.2.6` | match React |
| TypeScript | `^6.0.3` | strict mode on |
| Tailwind CSS | `^4.3.0` | CSS-first config in `app/globals.css` via `@theme` — **no `tailwind.config.js`** |
| `@tailwindcss/postcss` | `^4.3.0` | match Tailwind |
| shadcn/ui | CLI | always `npx shadcn@latest` — never pin |
| `pg` (node-postgres) | `^8.20.0` | raw parameterized SQL |
| `@types/pg` | `^8.x` | match `pg` major |
| Zod | `^4.4.3` | shared client + server |
| `@google/genai` | `^2.3.0` | requires ≥1.33 for current features |

## Runtime / infrastructure

| Layer | Version | Notes |
|---|---|---|
| Node.js | `>=22 LTS` | Next 16 minimum |
| PostgreSQL | `18.x` (latest 18.4) | Cloud SQL — keep on the current major |
| PostGIS | `3.6.x` (latest 3.6.3) | enable extension; use `geography(Point, 4326)` |
| Gemini model | `gemini-3.1-pro` (default) / `gemini-3.1-flash` (extraction) | 3.1 series, Feb 2026 |
| Google Places | Places API (New) | **not** the deprecated legacy Places API |

---

## Update policy

1. **Read the changelog before any major bump** (Next, React, TS, Tailwind, PostgreSQL, PostGIS, Gemini model). Note breaking changes in the PR.
2. **Patch / minor bumps** — fine to take freely; run `npm run typecheck && npm run build` first.
3. **Pin via `^`** in `package.json` (caret minor range), never via `*` or `latest`.
4. **Update this file in the same PR** as any version change. Bump the "Last verified" date.
5. **No prereleases** in `main`. `beta` / `rc` / `canary` builds only in throwaway branches.

## How to re-verify

```bash
# npm-published packages
for pkg in next react typescript tailwindcss pg zod @google/genai; do
  printf "%-20s %s\n" "$pkg" "$(npm view "$pkg" version)"
done

# PostgreSQL / PostGIS / Gemini — check the official pages
#   https://www.postgresql.org/docs/release/
#   https://postgis.net/news/
#   https://ai.google.dev/gemini-api/docs/changelog
```

---

## Anti-patterns

- ❌ Installing `next@canary` or `react@experimental` outside a spike branch.
- ❌ Pinning `gemini-1.5-*` or `gemini-2.x` — those are superseded; use the 3.1 series.
- ❌ Using the legacy Google Places API (`/maps/api/place/*`) — only the New API (`places.googleapis.com/v1/...`).
- ❌ Adding a `tailwind.config.js` — Tailwind v4 is CSS-first.
- ❌ Silently bumping a major version without updating this file and `ARCHITECTURE.md`.
