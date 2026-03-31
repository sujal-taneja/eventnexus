import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe-server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile-server";
import { getClientIpFromRequest } from "@/lib/client-ip";
import { releaseUserSeatLocks } from "@/lib/release-locks";
import { invalidateSearchCaches } from "@/lib/invalidate-search-cache";
import { scheduleAfterResponse } from "@/lib/async-jobs";
import { sendBookingConfirmationJob } from "@/lib/send-booking-confirmation-job";

interface CartItem {
  ticketTypeId: string;
  eventId: string;
  quantity: number;
  // NOTE: price is intentionally NOT used from the client — we fetch it from DB
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    // Rate-limit: 5 payment intent creations per user per minute
    const { success } = await rateLimit(
      `${session.user.id}:payment-intent`,
      5,
      60
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before retrying." },
        { status: 429 }
      );
    }

    const ip = getClientIpFromRequest(req);
    const ipCap = await rateLimit(`${ip}:payment-intent-ip`, 25, 3600);
    if (!ipCap.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before retrying." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      items,
      billingEmail,
      turnstileToken,
    }: { items: CartItem[]; billingEmail?: string; turnstileToken?: string } = body;

    if (!(await verifyTurnstileToken(turnstileToken))) {
      return NextResponse.json(
        { error: "Security verification failed. Refresh and complete the check." },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Validate basic shape (no price validation here — we fetch from DB)
    for (const item of items) {
      if (
        typeof item.ticketTypeId !== "string" ||
        typeof item.eventId !== "string" ||
        typeof item.quantity !== "number" ||
        item.quantity < 1 ||
        item.quantity > 10
      ) {
        return NextResponse.json(
          { error: "Invalid cart item data" },
          { status: 400 }
        );
      }
    }

    // ── Fetch authoritative prices from the database ──────────────────────────
    // Never trust the price sent by the client — always look it up server-side.
    const ticketTypeIds = items.map((i) => i.ticketTypeId);
    const ticketTypes = await prisma.ticketType.findMany({
      where: { id: { in: ticketTypeIds } },
      select: { id: true, price: true, eventId: true },
    });

    const priceMap = new Map(ticketTypes.map((t) => [t.id, t]));

    // Verify every item's eventId matches the DB record (prevent cross-event spoofing)
    for (const item of items) {
      const dbTicket = priceMap.get(item.ticketTypeId);
      if (!dbTicket) {
        return NextResponse.json(
          { error: `Ticket type ${item.ticketTypeId} not found` },
          { status: 404 }
        );
      }
      if (dbTicket.eventId !== item.eventId) {
        return NextResponse.json(
          { error: "Ticket does not belong to the specified event" },
          { status: 400 }
        );
      }
    }

    // Organizer comp: if ALL items are for events owned by the current user (or ADMIN),
    // allow a free booking (₹0) and bypass Stripe while keeping the same email flow.
    const eventIds = Array.from(new Set(items.map((i) => i.eventId)));
    const events = await prisma.event.findMany({
      where: { id: { in: eventIds } },
      select: { id: true, organizerId: true, title: true, date: true, location: true, timeZone: true },
    });
    const organizerMap = new Map(events.map((e) => [e.id, e.organizerId]));
    const ownsAll =
      session.user.role === "ADMIN" ||
      eventIds.every((eid) => organizerMap.get(eid) === session.user.id);

    if (ownsAll) {
      const compId = `comp_${session.user.id}_${createHash("sha256")
        .update(JSON.stringify(items))
        .digest("hex")
        .slice(0, 20)}`;

      const created = await prisma.$transaction(
        items.map((item) =>
          prisma.booking.create({
            data: {
              userId: session.user.id,
              eventId: item.eventId,
              ticketTypeId: item.ticketTypeId,
              quantity: item.quantity,
              totalAmount: 0,
              status: "CONFIRMED",
              paymentIntentId: compId,
            },
          })
        )
      );

      await releaseUserSeatLocks(
        session.user.id,
        items.map((i) => ({ ticketTypeId: i.ticketTypeId }))
      );
      await invalidateSearchCaches();

      const receipt =
        typeof billingEmail === "string"
          ? billingEmail.trim().slice(0, 320)
          : "";

      // Compose booking rows for email job
      const bookingRows = created.map((b, idx) => {
        const item = items[idx];
        const ev = events.find((e) => e.id === item.eventId)!;
        return {
          id: b.id,
          eventId: b.eventId,
          quantity: b.quantity,
          totalAmount: b.totalAmount,
          ticketType: { name: "Ticket" }, // filled below
          status: b.status,
          event: { title: ev.title, date: ev.date, location: ev.location, timeZone: ev.timeZone },
        };
      });

      // Fill ticketType names in one query (avoid relying on placeholder)
      const ticketNames = await prisma.ticketType.findMany({
        where: { id: { in: ticketTypeIds } },
        select: { id: true, name: true },
      });
      const nameMap = new Map(ticketNames.map((t) => [t.id, t.name]));
      for (let i = 0; i < bookingRows.length; i++) {
        const tid = items[i].ticketTypeId;
        bookingRows[i].ticketType = { name: nameMap.get(tid) ?? "Ticket" };
      }

      scheduleAfterResponse(() =>
        sendBookingConfirmationJob({
          userEmail: session.user.email ?? "",
          receiptEmail: receipt || undefined,
          userName: session.user.name ?? "there",
          paymentIntentId: compId,
          bookings: bookingRows,
          emailTheme: "auto",
          emailFallbackTheme: "light",
        })
      );

      return NextResponse.json({ freeCheckout: true });
    }

    // Calculate total using DB prices — NOT the client-supplied ones
    const totalPaise = items.reduce((sum, item) => {
      const dbPrice = priceMap.get(item.ticketTypeId)!.price;
      return sum + Math.round(dbPrice * item.quantity * 100);
    }, 0);

    if (totalPaise < 50) {
      return NextResponse.json(
        { error: "Minimum charge is ₹0.50" },
        { status: 400 }
      );
    }

    // Store structured items JSON so the webhook can create Booking records.
    // Use DB prices here too, so the webhook creates correct totalAmount values.
    const itemsMeta = JSON.stringify(
      items.map((i) => ({
        tid: i.ticketTypeId,
        eid: i.eventId,
        qty: i.quantity,
        price: priceMap.get(i.ticketTypeId)!.price, // DB price
      }))
    );

    const receipt =
      typeof billingEmail === "string"
        ? billingEmail.trim().slice(0, 320)
        : "";

    // Idempotency key: user + cart + receipt email (metadata for ticketing).
    const idempotencyKey = `pi:${session.user.id}:${createHash("sha256")
      .update(`${itemsMeta}\n${receipt}`)
      .digest("hex")
      .slice(0, 40)}`;

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: totalPaise,
        currency: "inr",
        automatic_payment_methods: { enabled: true },
        metadata: {
          userId: session.user.id,
          userEmail: session.user.email ?? "",
          items: itemsMeta.slice(0, 500),
          receiptEmail: receipt,
        },
      },
      { idempotencyKey }
    );

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("[STRIPE_PAYMENT_INTENT]", error);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
