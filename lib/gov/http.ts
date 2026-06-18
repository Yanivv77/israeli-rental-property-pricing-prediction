import "server-only";

/**
 * The single door to the government servers (govmap real-estate API). Every
 * gov call — geocode and deals — goes through here so one global throttle and
 * one retry policy cover them all. These endpoints are unofficial, slow, and
 * rate-limited (the reference client caps at 5 req/s; we stay under at ~3),
 * so requests are serialized with a minimum gap and retried with backoff.
 */
const BASE = process.env.GOVMAP_BASE_URL ?? "https://www.govmap.gov.il/api";
const UA = "NadlanMCP/1.0.0";
const MIN_GAP_MS = 350; // ~3 req/s, under the reference's 5 req/s ceiling
const TIMEOUT_MS = 15_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Serialize every gov call through one chain and space them MIN_GAP_MS apart.
let gate = Promise.resolve();
let lastAt = 0;
function throttle(): Promise<void> {
  const next = gate.then(async () => {
    const wait = MIN_GAP_MS - (Date.now() - lastAt);
    if (wait > 0) await sleep(wait);
    lastAt = Date.now();
  });
  gate = next.catch(() => {}); // a failed turn must not wedge the queue
  return next;
}

/** Raised when the gov source is unreachable/erroring after retries. */
export class GovUnavailableError extends Error {}

/**
 * Throttled `fetch` against the gov API with timeout + exponential backoff on
 * 429/5xx/network errors. A JSON body is sent as `application/json`. Returns
 * parsed JSON; throws {@link GovUnavailableError} once retries are exhausted.
 */
export async function govFetch<T = unknown>(
  path: string,
  init: { method?: string; body?: unknown } = {},
  retries = 3,
): Promise<T> {
  const { method = "GET", body } = init;
  for (let attempt = 0; ; attempt++) {
    await throttle();
    try {
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
          "User-Agent": UA,
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`${path} → HTTP ${res.status}`);
      }
      if (!res.ok) throw new GovUnavailableError(`${path} → HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (err) {
      if (attempt >= retries) {
        throw new GovUnavailableError(
          `gov source unavailable: ${(err as Error).message}`,
        );
      }
      await sleep(400 * 2 ** attempt); // 400ms, 800ms, 1600ms
    }
  }
}
