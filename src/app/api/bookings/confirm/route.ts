/**
 * POST /api/bookings/confirm
 *
 * Called by the client immediately after Stripe confirms payment.
 * Verifies the PaymentIntent status with Stripe, then creates Booking
 * records in the database.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe-server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { releaseUserSeatLocks } from "@/lib/release-locks";
import { invalidateSearchCaches } from "@/lib/invalidate-search-cache";
import { scheduleAfterResponse } from "@/lib/async-jobs";
import { sendBookingConfirmationJob } from "@/lib/send-booking-confirmation-job";
import { getClientIpFromRequest } from "@/lib/client-ip";
import type { EmailFallbackTheme, EmailTheme } from "@/types/email-theme";

interface ConfirmItem {
  ticketTypeId: string;
  eventId: string;
  quantity: number;
  price: number;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { success } = await rateLimit(`${session.user.id}:booking-confirm`, 3, 60);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const ip = getClientIpFromRequest(req);
    const ipOk = await rateLimit(`${ip}:booking-confirm-ip`, 25, 3600);
    if (!ipOk.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const {
      paymentIntentId,
      items,
      billingEmail,
      emailTheme,
      emailFallbackTheme,
    }: {
      paymentIntentId: string;
      items: ConfirmItem[];
      billingEmail?: string;
      emailTheme?: EmailTheme;
      emailFallbackTheme?: EmailFallbackTheme;
    } = body;

    // Only allow safe theme values (avoid sending arbitrary strings into templates).
    const safeEmailTheme: EmailTheme | undefined =
      emailTheme === "light" || emailTheme === "dark" || emailTheme === "auto"
        ? emailTheme
        : undefined;
    const safeFallback: EmailFallbackTheme | undefined =
      emailFallbackTheme === "light" || emailFallbackTheme === "dark"
        ? emailFallbackTheme
        : undefined;

    if (!paymentIntentId || typeof paymentIntentId !== "string") {
      return NextResponse.json({ error: "Missing paymentIntentId" }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items to confirm" }, { status: 400 });
    }

    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const receipt =
      typeof billingEmail === "string" ? billingEmail.trim().slice(0, 320) : "";

    if (intent.status !== "succeeded") {
      return NextResponse.json(
        { error: `Payment not confirmed (status: ${intent.status})` },
        { status: 402 }
      );
    }

    if (intent.metadata?.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.booking.findFirst({
      where: { paymentIntentId },
    });
    if (existing) {
      return NextResponse.json({ success: true, alreadyConfirmed: true });
    }

    const m = intent.metadata ?? {};
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: {
        userId: m.userId ?? "",
        userEmail: m.userEmail ?? "",
        items: m.items ?? "",
        receiptEmail: receipt || (m.receiptEmail as string | undefined) || "",
      },
    });

    const ticketIds = items.map((i) => i.ticketTypeId);
    const ticketTypes = await prisma.ticketType.findMany({
      where: { id: { in: ticketIds } },
      select: {
        id: true,
        name: true,
        price: true,
        event: { select: { title: true, date: true, location: true, timeZone: true } },
      },
    });
    const priceMap = new Map(ticketTypes.map((t) => [t.id, t]));

    const created = await prisma.$transaction(
      items.map((item) => {
        const ticket = priceMap.get(item.ticketTypeId);
        const dbPrice = ticket?.price ?? item.price;
        return prisma.booking.create({
          data: {
            userId: session.user.id,
            eventId: item.eventId,
            ticketTypeId: item.ticketTypeId,
            quantity: item.quantity,
            totalAmount: dbPrice * item.quantity,
            status: "CONFIRMED",
            paymentIntentId,
          },
        });
      })
    );

    await releaseUserSeatLocks(
      session.user.id,
      items.map((i) => ({ ticketTypeId: i.ticketTypeId }))
    );
    await invalidateSearchCaches();

    const userEmail = session.user.email;
    if (userEmail) {
      const bookingsForEmail = created.map((b, i) => {
        const item = items[i];
        const t = priceMap.get(item.ticketTypeId)!;
        return {
          id: b.id,
          eventId: b.eventId,
          quantity: b.quantity,
          totalAmount: b.totalAmount,
          ticketType: { name: t.name },
          event: t.event,
        };
      });
      scheduleAfterResponse(() =>
        sendBookingConfirmationJob({
          userEmail,
          receiptEmail: receipt || undefined,
          userName: session.user.name ?? "there",
          paymentIntentId,
          bookings: bookingsForEmail,
          emailTheme: safeEmailTheme ?? "auto",
          emailFallbackTheme: safeFallback ?? "light",
        })
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[BOOKINGS_CONFIRM]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
