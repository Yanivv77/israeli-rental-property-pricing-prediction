# Stack Versions

> **Use the stable versions pinned here.** Do not install `beta`, `rc`, `canary`, `next`, or `insiders` tags. If a package below has a newer major release, update this file *and* `ARCHITECTURE.md` in the same PR — never silently bump.
>
> **pnpm only.** Do not use `npm` or `yarn` in this repo.
>
> Last verified: **2026-06-18**

---

## Pinned versions

| Tech | Version | Notes |
|---|---|---|
| Next.js | `^16.2.9` | App Router, Server Components default |
| React | `^19.2.7` | RSC-aware |
| React DOM | `^19.2.7` | match React |
| TypeScript | `^6.0.3` | strict mode on |
| Tailwind CSS | `^4.3.1` | CSS-first config in `app/globals.css` via `@theme` — **no `tailwind.config.js`** |
| `@tailwindcss/postcss` | `^4.3.1` | match Tailwind |
| shadcn/ui | CLI | always `pnpm dlx shadcn@latest` — never pin |
| `drizzle-orm` | `^0.45.2` | ORM for **our Neon cache only** (the "fridge") |
| `drizzle-kit` | `^0.31.10` | migration generator (`pnpm db:generate`) |
| `@neondatabase/serverless` | `^1.1.0` | Neon HTTP driver (used via `drizzle-orm/neon-http`) |
| Zod | `^4.4.3` | shared client + server; validates every external response |
| `@google/genai` | `^2.8.0` | Gemini narrative (wired in prompt 03) |
| Recharts | `^3.8.1` | charts in the report |
| `lucide-react` | `^1.20.0` | icons (shadcn default) |
| `clsx` + `tailwind-merge` | `^2.1.1` / `^3.6.0` | `cn()` helper |
| `class-variance-authority` | `^0.7.1` | shadcn variants |
| ESLint | `^9.39.4` | flat config (`eslint.config.mjs`); ESLint 10 not yet supported by `eslint-plugin-react` bundled in `eslint-config-next@16` |
| `eslint-config-next` | `^16.2.9` | match Next; consumed via its native flat configs (`/core-web-vitals`, `/typescript`) |

## Runtime / infrastructure

| Layer | Version | Notes |
|---|---|---|
| Node.js | `>=22 LTS` | Next 16 minimum |
| pnpm | `11.5.3` | pinned via `packageManager` field |
| Neon Postgres | serverless | OUR cache only — **not** a wrapper over gov APIs |
| Gemini model | `gemini-3.1-pro` (narrative) | 3.1 series; the LLM only narrates, never computes |
| govmap | public geocode endpoint | address → ITM point + gush/helka; no key (prompt 03) |
| nadlan | public deals endpoint | recent transactions per gush; no key (prompt 03) |
| data-gov-il MCP | dev-time only | dataset discovery via `.mcp.json`; never a runtime dependency |

---

## Update policy

1. **Read the changelog before any major bump** (Next, React, TS, Tailwind, Drizzle, Zod, Gemini model). Note breaking changes in the PR.
2. **Patch / minor bumps** — fine to take freely; run `pnpm typecheck && pnpm build` first.
3. **Pin via `^`** in `package.json` (caret minor range), never via `*` or `latest`.
4. **Update this file in the same PR** as any version change. Bump the "Last verified" date.
5. **No prereleases** in `main`. `beta` / `rc` / `canary` builds only in throwaway branches.

## How to re-verify

```bash
# npm-published packages (read-only check; install with pnpm)
for pkg in next react typescript tailwindcss drizzle-orm drizzle-kit @neondatabase/serverless zod @google/genai recharts; do
  printf "%-28s %s\n" "$pkg" "$(pnpm view "$pkg" version)"
done

# Gemini model — check the official changelog
#   https://ai.google.dev/gemini-api/docs/changelog
```

---

## Anti-patterns

- ❌ Using `npm` or `yarn` — pnpm only.
- ❌ Installing `next@canary` or `react@experimental` outside a spike branch.
- ❌ Pinning `gemini-1.5-*` or `gemini-2.x` — those are superseded; use the 3.1 series.
- ❌ Building an ORM/wrapper over the gov APIs — Drizzle is for the Neon cache only.
- ❌ Adding a `tailwind.config.js` — Tailwind v4 is CSS-first.
- ❌ Silently bumping a major version without updating this file and `ARCHITECTURE.md`.
