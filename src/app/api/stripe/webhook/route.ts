/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe events server-side. Verifies every request with the
 * webhook signing secret so only genuine Stripe events are processed.
 *
 * Handled events:
 *   payment_intent.succeeded  — create Booking records (idempotent)
 *   payment_intent.payment_failed — log; optionally notify user
 *   charge.refunded            — mark booking as REFUNDED
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe-server";
import { prisma } from "@/lib/prisma";
import { releaseUserSeatLocks } from "@/lib/release-locks";
import { invalidateSearchCaches } from "@/lib/invalidate-search-cache";
import { scheduleAfterResponse } from "@/lib/async-jobs";
import { sendBookingConfirmationJob } from "@/lib/send-booking-confirmation-job";

async function getRawBody(req: NextRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = req.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[WEBHOOK] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await getRawBody(req);
    // Use constructEventAsync (recommended for serverless/Edge environments)
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[WEBHOOK] Signature verification failed:", msg);
    return NextResponse.json({ error: `Invalid signature: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(intent);
        break;
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        console.warn("[WEBHOOK] Payment failed for intent:", intent.id);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleRefund(charge);
        break;
      }
      default:
        // Log unhandled events for debugging but always return 200
        console.log("[WEBHOOK] Unhandled event type:", event.type);
    }
  } catch (err) {
    console.error("[WEBHOOK] Error processing event", event.type, err);
    // Return 500 so Stripe retries
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSucceeded(intent: Stripe.PaymentIntent) {
  const { userId, items: itemsJson } = intent.metadata ?? {};

  if (!userId || !itemsJson) {
    console.warn("[WEBHOOK] payment_intent.succeeded missing metadata", intent.id);
    return;
  }

  // Idempotency check
  const existing = await prisma.booking.findFirst({
    where: { paymentIntentId: intent.id },
  });
  if (existing) {
    console.log("[WEBHOOK] Bookings already exist for intent", intent.id);
    return;
  }

  let items: { tid: string; eid: string; qty: number; price: number }[];
  try {
    items = JSON.parse(itemsJson);
  } catch {
    console.error("[WEBHOOK] Failed to parse items JSON for intent", intent.id);
    return;
  }

  await prisma.$transaction(
    items.map((item) =>
      prisma.booking.create({
        data: {
          userId,
          eventId: item.eid,
          ticketTypeId: item.tid,
          quantity: item.qty,
          totalAmount: item.price * item.qty,
          status: "CONFIRMED",
          paymentIntentId: intent.id,
        },
      })
    )
  );

  await releaseUserSeatLocks(
    userId,
    items.map((i) => ({ ticketTypeId: i.tid }))
  );
  await invalidateSearchCaches();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  if (user?.email) {
    const rows = await prisma.booking.findMany({
      where: { paymentIntentId: intent.id },
      include: {
        ticketType: { select: { name: true } },
        event: { select: { title: true, date: true, location: true } },
      },
    });
    const bookingsForEmail = rows.map((b) => ({
      id: b.id,
      eventId: b.eventId,
      quantity: b.quantity,
      totalAmount: b.totalAmount,
      ticketType: { name: b.ticketType.name },
      event: b.event,
    }));
    const receiptEmail = (intent.metadata?.receiptEmail as string | undefined)?.trim();
    scheduleAfterResponse(() =>
      sendBookingConfirmationJob({
        userEmail: user.email!,
        receiptEmail: receiptEmail || undefined,
        userName: user.name ?? "there",
        paymentIntentId: intent.id,
        bookings: bookingsForEmail,
        emailTheme: "auto",
        emailFallbackTheme: "light",
      })
    );
  }

  console.log(
    `[WEBHOOK] Created ${items.length} booking(s) for user ${userId}, intent ${intent.id}`
  );
}

async function handleRefund(charge: Stripe.Charge) {
  if (!charge.payment_intent) return;
  const intentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent.id;

  await prisma.booking.updateMany({
    where: { paymentIntentId: intentId },
    data: { status: "REFUNDED" },
  });
  await invalidateSearchCaches();

  console.log("[WEBHOOK] Marked bookings REFUNDED for intent", intentId);
}
