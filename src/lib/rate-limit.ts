/**
 * In-memory rate limiter using a Map.
 *
 * PRODUCTION NOTE: This limiter is per-process and will NOT work
 * across multiple serverless instances on Vercel. For true cross-instance
 * rate limiting, migrate to Upstash Redis (@upstash/ratelimit).
 * This is still useful as a first line of defense within a single
 * function invocation lifespan.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodically prune expired entries every 60 seconds
if (typeof globalThis !== "undefined") {
  // Avoid duplicate intervals across hot-reloads in dev
  const key = "__rl_cleanup__";
  if (!(globalThis as Record<string, unknown>)[key]) {
    (globalThis as Record<string, unknown>)[key] = setInterval(() => {
      const now = Date.now();
      for (const [k, entry] of store) {
        if (now > entry.resetAt) store.delete(k);
      }
    }, 60_000);
  }
}

/**
 * Check (and consume) a rate limit token.
 *
 * @param key     - Unique key, e.g. `"login:1.2.3.4"`
 * @param limit   - Max attempts allowed in the window
 * @param windowS - Window length in seconds
 */
function check(key: string, limit: number, windowS: number): RateLimitResult {
  const now = Date.now();
  const windowMs = windowS * 1000;
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, reset: now + windowMs };
  }

  entry.count++;

  if (entry.count > limit) {
    return { success: false, remaining: 0, reset: entry.resetAt };
  }

  return { success: true, remaining: limit - entry.count, reset: entry.resetAt };
}

export const rateLimiter = { check };
