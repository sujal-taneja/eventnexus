import { redis } from "@/lib/redis";

/** Release Redis seat locks for a user after payment confirms (or abandon). */
export async function releaseUserSeatLocks(
  userId: string,
  tickets: { ticketTypeId: string }[]
): Promise<void> {
  const seen = new Set<string>();
  for (const t of tickets) {
    if (seen.has(t.ticketTypeId)) continue;
    seen.add(t.ticketTypeId);
    const userLockKey = `user_lock:${userId}:ticket:${t.ticketTypeId}`;
    const lockedKey = `ticket:${t.ticketTypeId}:locked`;
    const userLockedQty = await redis.get(userLockKey);
    if (userLockedQty !== null) {
      const qty = parseInt(userLockedQty, 10);
      const globalLocked = parseInt((await redis.get(lockedKey)) ?? "0", 10);
      await redis.set(lockedKey, String(Math.max(0, globalLocked - qty)));
      await redis.del(userLockKey);
    }
  }
}
