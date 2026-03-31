import { redis } from "@/lib/redis";

/** Drop all cached search result keys (bookings / events changed). */
export async function invalidateSearchCaches(): Promise<void> {
  try {
    const keys = await redis.keys("cache:search:*");
    if (keys.length > 0) await redis.del(...keys);
  } catch (e) {
    console.warn("[SEARCH_CACHE] invalidate failed", e);
  }
}
