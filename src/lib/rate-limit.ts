import { redis } from './redis';

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  limit: number;
  resetInSeconds: number;
}

/**
 * Fixed-window rate limiter backed by Redis.
 *
 * Uses INCR + EXPIRE so the entire logic fits in two round trips.
 * A sliding-window approach would require a sorted set (ZADD/ZRANGEBYSCORE);
 * this is intentionally simpler and sufficient for protecting booking endpoints.
 *
 * @param identifier - unique bucket key, e.g. "{ip}:reserve"
 * @param limit      - max requests allowed per window (default 10)
 * @param windowSec  - window length in seconds (default 60)
 */
export async function rateLimit(
  identifier: string,
  limit = 10,
  windowSec = 60
): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`;

  // INCR is atomic: if key doesn't exist Redis creates it at 0 then returns 1
  const count = await redis.incr(key);

  // Set expiry only on the first increment so the window starts fresh
  if (count === 1) {
    await redis.expire(key, windowSec);
  }

  // TTL may be -1 if EXPIRE raced; fall back to full window
  const ttl = await redis.ttl(key);

  return {
    success: count <= limit,
    remaining: Math.max(0, limit - count),
    limit,
    resetInSeconds: ttl > 0 ? ttl : windowSec,
  };
}
