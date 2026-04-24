interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX = 10;

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
  remaining: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true, retryAfterSec: 0, remaining: RATE_LIMIT_MAX - 1 };
  }
  if (b.count >= RATE_LIMIT_MAX) {
    return {
      ok: false,
      retryAfterSec: Math.ceil((b.resetAt - now) / 1000),
      remaining: 0,
    };
  }
  b.count++;
  return { ok: true, retryAfterSec: 0, remaining: RATE_LIMIT_MAX - b.count };
}

export function __resetRateLimit(): void {
  buckets.clear();
}
