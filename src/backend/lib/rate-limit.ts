import Redis from "ioredis";

/**
 * Fixed-window rate limiter, Redis-backed when REDIS_URL is set so limits
 * are shared across serverless instances. Falls back to an in-memory Map
 * (single-process only) for local dev without Redis.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

// Cleanup stale buckets every 5 min to prevent memory bloat
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of store.entries()) {
      if (bucket.resetAt < now) store.delete(key);
    }
  }, 5 * 60 * 1000);
  if (cleanupTimer.unref) cleanupTimer.unref();
}

export interface RateLimitOptions {
  /** Max requests in the window */
  max: number;
  /** Window length in ms */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

function rateLimitLocal(key: string, opts: RateLimitOptions): RateLimitResult {
  ensureCleanup();
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt < now) {
    const resetAt = now + opts.windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, remaining: opts.max - 1, resetAt, retryAfterSeconds: 0 };
  }

  if (existing.count >= opts.max) {
    return {
      success: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    success: true,
    remaining: opts.max - existing.count,
    resetAt: existing.resetAt,
    retryAfterSeconds: 0,
  };
}

// Atomically increments the counter and sets its expiry only on the first
// hit in a window, so repeated INCRs don't keep pushing the reset time out.
const INCR_WITH_EXPIRY_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return {count, ttl}
`;

const globalForRedis = globalThis as unknown as { rateLimitRedis: Redis | undefined };

function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (!globalForRedis.rateLimitRedis) {
    const client = new Redis(url);
    client.on("error", (err) => console.error("[rate-limit] Redis error:", err));
    globalForRedis.rateLimitRedis = client;
  }
  return globalForRedis.rateLimitRedis;
}

async function rateLimitRedis(key: string, opts: RateLimitOptions, redis: Redis): Promise<RateLimitResult> {
  const [count, ttl] = (await redis.eval(
    INCR_WITH_EXPIRY_SCRIPT,
    1,
    `ratelimit:${key}`,
    opts.windowMs
  )) as [number, number];

  const resetAt = Date.now() + ttl;
  if (count > opts.max) {
    return {
      success: false,
      remaining: 0,
      resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil(ttl / 1000)),
    };
  }
  return { success: true, remaining: opts.max - count, resetAt, retryAfterSeconds: 0 };
}

export async function rateLimit(key: string, opts: RateLimitOptions): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) return rateLimitLocal(key, opts);

  try {
    return await rateLimitRedis(key, opts, redis);
  } catch (err) {
    // Fail open on Redis errors: fall back to per-process limiting rather
    // than blocking all traffic because of an infra hiccup.
    console.error("[rate-limit] Redis unavailable, falling back to in-memory:", err);
    return rateLimitLocal(key, opts);
  }
}

/** Best-effort client IP extraction (trusts X-Forwarded-For from infra). */
export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  return "unknown";
}

/** Convenience helper for API routes. Returns Response on limit, null when OK. */
export async function rateLimitResponse(
  key: string,
  opts: RateLimitOptions
): Promise<Response | null> {
  const r = await rateLimit(key, opts);
  if (r.success) return null;
  return new Response(
    JSON.stringify({ success: false, error: "Too many requests" }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(r.retryAfterSeconds),
        "X-RateLimit-Reset": String(Math.floor(r.resetAt / 1000)),
      },
    }
  );
}
