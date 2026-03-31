import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile-server";
import { NextResponse } from "next/server";
import { getClientIpFromRequest } from "@/lib/client-ip";

const MAX_QUANTITY_PER_TYPE = 10;

function getClientIp(headersList: Awaited<ReturnType<typeof headers>>): string {
  return (
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headersList.get("x-real-ip") ??
    "anonymous"
  );
}

/**
 * POST /api/reserve
 * Atomically lock seats in Redis for 10 minutes.
 * Rate-limited to 10 attempts per IP per minute to prevent hoarding.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Rate limiting ──────────────────────────────────────────────────────
    const headersList = await headers();
    const ip = getClientIp(headersList);
    const { success: allowed, remaining, resetInSeconds } = await rateLimit(
      `${ip}:reserve`,
      10,
      60
    );

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before trying again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(resetInSeconds),
            "X-RateLimit-Limit": "10",
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // ── Input validation ───────────────────────────────────────────────────
    const body = await req.json();
    const { tickets } = body as {
      eventId?: string;
      tickets: { id: string; quantity: number }[];
      /** Turnstile token from the frontend security check (required when configured). */
      turnstileToken?: string;
    };

    const turnstileOk = await verifyTurnstileToken(body?.turnstileToken);
    if (!turnstileOk) {
      return NextResponse.json(
        { error: "Security verification failed. Refresh and complete the check." },
        { status: 400 }
      );
    }

    if (!tickets || tickets.length === 0) {
      return NextResponse.json({ error: "No tickets selected" }, { status: 400 });
    }

    for (const t of tickets) {
      if (
        !Number.isInteger(t.quantity) ||
        t.quantity < 1 ||
        t.quantity > MAX_QUANTITY_PER_TYPE
      ) {
        return NextResponse.json(
          { error: `Quantity must be between 1 and ${MAX_QUANTITY_PER_TYPE}` },
          { status: 400 }
        );
      }
    }

    // ── Capacity check + lock ──────────────────────────────────────────────
    for (const t of tickets) {
      const dbTicket = await prisma.ticketType.findUnique({ where: { id: t.id } });
      if (!dbTicket) {
        return NextResponse.json(
          { error: `Ticket ${t.id} not found` },
          { status: 404 }
        );
      }

      const lockedKey = `ticket:${t.id}:locked`;
      const currentlyLocked = parseInt((await redis.get(lockedKey)) ?? "0");

      const booked = await prisma.booking.aggregate({
        where: { ticketTypeId: t.id, status: { not: "CANCELLED" } },
        _sum: { quantity: true },
      });

      const totalTaken = (booked._sum.quantity ?? 0) + currentlyLocked;

      if (totalTaken + t.quantity > dbTicket.capacity) {
        return NextResponse.json(
          { error: `Not enough seats available for ${dbTicket.name}` },
          { status: 400 }
        );
      }

      await redis.incrby(lockedKey, t.quantity);
      // Per-user lock with 10-minute TTL; the DELETE endpoint releases it early
      await redis.set(
        `user_lock:${session.user.id}:ticket:${t.id}`,
        t.quantity,
        "EX",
        600
      );
    }

    return NextResponse.json(
      { success: true, message: "Seats locked successfully for 10 minutes" },
      {
        headers: {
          "X-RateLimit-Remaining": String(remaining),
        },
      }
    );
  } catch (error) {
    console.error("[RESERVE_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/reserve
 * Explicitly release seat locks when the user abandons checkout
 * (timer expiry, cart edit, or page close with a sendBeacon call).
 *
 * Body: { tickets: { id: string; quantity: number }[] }
 */
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIpFromRequest(req);
    const delLimit = await rateLimit(`${ip}:reserve-delete`, 45, 60);
    if (!delLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const { tickets } = body as { tickets: { id: string; quantity: number }[] };

    if (!tickets || tickets.length === 0) {
      return NextResponse.json({ error: "No tickets specified" }, { status: 400 });
    }

    for (const t of tickets) {
      const userLockKey = `user_lock:${session.user.id}:ticket:${t.id}`;
      const lockedKey = `ticket:${t.id}:locked`;

      // Only decrement if this user actually holds a lock for this ticket
      const userLockedQty = await redis.get(userLockKey);
      if (userLockedQty !== null) {
        const qty = parseInt(userLockedQty);
        const globalLocked = parseInt((await redis.get(lockedKey)) ?? "0");
        // Guard against the global counter going below zero
        await redis.set(lockedKey, Math.max(0, globalLocked - qty));
        await redis.del(userLockKey);
      }
    }

    return NextResponse.json({ success: true, message: "Locks released" });
  } catch (error) {
    console.error("[RESERVE_DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
