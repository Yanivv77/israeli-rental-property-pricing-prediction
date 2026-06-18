# Data sources, keys & caveats (prompt 02 → respect in prompt 03)

External dependencies and what prompt 03 must honor when building the live data engine.
Verified **2026-06-18** against `https://www.govmap.gov.il/api`.

## Which services need a key

| Service | Key? | Env var | Notes |
|---|---|---|---|
| Neon (Postgres — the fridge) | **yes** | `DATABASE_URL` | pooled connection string |
| Gemini (AI narrative) | **yes** | `GEMINI_API_KEY` | cheap model (`GEMINI_MODEL`, default Flash-Lite) |
| Vercel (env + deploy) | **yes** (login) | — | set the two vars above for Production + Preview |
| govmap (geocode + deals) | **no** | `GOVMAP_TOKEN` only if a chosen Survey-of-Israel layer requires it | public/unofficial |
| nadlan.gov.il (transactions) | **no** | — | unofficial, rate-limited, ToS-sensitive |
| data.gov.il + data-gov-il MCP | **no** | — | reads only; MCP is dev-time discovery, never deploys |

## Verified govmap endpoints (base `https://www.govmap.gov.il/api`)

| Call | Method | Path | Status 2026-06-18 |
|---|---|---|---|
| Autocomplete (address → point) | POST | `/search-service/autocomplete` | ✅ works (3040 results for "דיזנגוף 50 תל אביב") |
| Deals-by-radius (polygon metadata + `dealscount`) | GET | `/real-estate/deals/{x},{y}/{radius}` | ✅ works (2 polygons, `dealscount:"30"`) |
| Gush/helka by point | POST | `/layers-catalog/entitiesByPoint` | ⚠️ **HTTP 400** — drifted |
| Street deal rows | GET | `/real-estate/street-deals/{polygon_id}` | ⚠️ **HTTP 500** ("Could not fetch street deals") |
| Neighborhood deal rows | GET | `/real-estate/neighborhood-deals/{polygon_id}` | ⚠️ **HTTP 500** |

Headers used: `Content-Type: application/json`, `User-Agent: NadlanMCP/1.0.0`.

### CRS gotcha
Autocomplete `shape` comes back as `POINT(x y)` in **Web Mercator (EPSG:3857)** — e.g. Dizengoff 50 → `3871175, 3773217` — **not ITM** (despite the reference repo labeling it lon/lat). Prompt 03 must treat these as 3857 and reproject to ITM/WGS84 where needed.

### Direct nadlan.gov.il
`POST https://www.nadlan.gov.il/Nadlan.REST/Main/GetDataByQuery` returns the **HTML SPA shell** (200 text/html), not JSON — it needs a browser session / anti-bot handling. Not headless-callable as-is; govmap's `/api/real-estate/*` is the practical path.

## Rate limiting (hard constraint)
- Reference client caps at **5 req/s**; our verify scripts use a conservative **~3 req/s** (350 ms between calls).
- Prompt 03 must throttle (token bucket or per-call delay), set a `User-Agent`, retry with exponential backoff, and **always read the fridge cache first** so a warm gush makes zero gov calls.

## ToS / commercial caution (decide now, per prompt 02)
- Endpoints are **unofficial / reverse-engineered**: no key, but they can change or break without notice (the gush/helka and deal-detail endpoints already drifted to 400/500 above).
- nadlan/govmap terms **restrict redistributing raw data**. For anything commercial:
  - treat the fridge (`deals`, `gush_sync`) as **internal cache only** — do not republish raw gov rows;
  - serve users computed stats + narrative, not bulk raw exports;
  - plan a **durable path**: the official Israel Tax Authority real-estate database or a formal data-access request.

## Open items for prompt 03
1. Re-derive the working **gush/helka** call (entitiesByPoint payload/CRS changed) or an alternative layer.
2. Re-derive working **deal-row** retrieval (govmap deal-detail is 500ing): retry/alternative params, the direct nadlan REST with a session, or the official source.
3. Implement throttling + cache-first reads honoring the limits above.
