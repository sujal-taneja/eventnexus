import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

/** Remaining seats = capacity − sold − globally locked (excludes precise per-user overlap). */
export async function getRemainingByTicketType(
  ticketTypeIds: string[]
): Promise<Map<string, number>> {
  if (ticketTypeIds.length === 0) return new Map();

  const tickets = await prisma.ticketType.findMany({
    where: { id: { in: ticketTypeIds } },
    select: { id: true, capacity: true },
  });

  const booked = await prisma.booking.groupBy({
    by: ["ticketTypeId"],
    where: { ticketTypeId: { in: ticketTypeIds }, status: { not: "CANCELLED" } },
    _sum: { quantity: true },
  });
  const soldMap = new Map(booked.map((b) => [b.ticketTypeId, b._sum.quantity ?? 0]));

  const out = new Map<string, number>();
  for (const t of tickets) {
    const sold = soldMap.get(t.id) ?? 0;
    const lockedRaw = await redis.get(`ticket:${t.id}:locked`);
    const locked = parseInt(lockedRaw ?? "0", 10) || 0;
    out.set(t.id, Math.max(0, t.capacity - sold - locked));
  }
  return out;
}
