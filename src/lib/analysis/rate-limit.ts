import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

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

interface RpcResult {
  ok: boolean;
  retry_after_sec?: number;
  remaining?: number;
}

function checkInMemory(
  key: string,
  max: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0, remaining: max - 1 };
  }
  if (b.count >= max) {
    return {
      ok: false,
      retryAfterSec: Math.ceil((b.resetAt - now) / 1000),
      remaining: 0,
    };
  }
  b.count++;
  return { ok: true, retryAfterSec: 0, remaining: max - b.count };
}

export async function checkRateLimit(
  supabase: SupabaseClient<Database>,
  key: string,
  max: number = RATE_LIMIT_MAX,
  windowMs: number = RATE_LIMIT_WINDOW_MS,
): Promise<RateLimitResult> {
  const rpc = supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: RpcResult | null; error: unknown }>;
  const res = await rpc("check_rate_limit", {
    p_key: key,
    p_max: max,
    p_window_ms: windowMs,
  });

  if (res.error || !res.data) {
    // RPC failed — fall back to in-memory so we still throttle on this isolate.
    return checkInMemory(key, max, windowMs);
  }
  if (res.data.ok) {
    return {
      ok: true,
      retryAfterSec: 0,
      remaining: res.data.remaining ?? max - 1,
    };
  }
  return {
    ok: false,
    retryAfterSec: res.data.retry_after_sec ?? Math.ceil(windowMs / 1000),
    remaining: 0,
  };
}

