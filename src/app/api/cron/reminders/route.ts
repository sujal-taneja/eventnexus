import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { render } from "@react-email/components";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromRequest } from "@/lib/client-ip";
import { EventReminderEmail } from "@/emails/event-reminder";
import QRCode from "qrcode";
import { createBookingTicketsPdfBytes } from "@/lib/booking-ticket-pdf";
import { formatEventDateTime } from "@/lib/timezone";
import { getAppUrl } from "@/lib/app-url";

const FROM =
  process.env.EMAIL_FROM ?? "EventNexus <onboarding@resend.dev>";
const APP_URL = getAppUrl();

export async function GET(req: NextRequest) {
  const ip = getClientIpFromRequest(req);
  const burst = await rateLimit(`cron-reminders:${ip}`, 30, 3600);
  if (!burst.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const authHeader = req.headers.get("authorization");
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Email not configured", processed: 0 },
      { status: 503 }
    );
  }
  const resend = new Resend(apiKey);

  const now = new Date();
  const next24 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const next48 = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  try {
    const upcomingEvents = await prisma.event.findMany({
      where: {
        date: { gte: next24, lt: next48 },
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        date: true,
        location: true,
        timeZone: true,
        bookings: {
          where: { status: "CONFIRMED" },
          include: { user: true, ticketType: true },
        },
      },
    });

    if (upcomingEvents.length === 0) {
      return NextResponse.json({
        message: "No upcoming events in the next 24 hours.",
        processed: 0,
      });
    }

    let emailsDispatched = 0;

    for (const event of upcomingEvents) {
      const fmt = formatEventDateTime({
        date: event.date,
        timeZone: (event as { timeZone?: string | null }).timeZone ?? undefined,
        locale: "en-IN",
      });
      const formattedDate = fmt.whenShort;
      const eventStartsIso = fmt.startsIso;
      const eventDateLong = fmt.dateLong;
      const eventTime = fmt.timeShort;

      for (const booking of event.bookings) {
        if (!booking.user.email) continue;

        const qrPayload = `eventnexus:batch:${booking.id}`;
        const qrDataUrl = await QRCode.toDataURL(qrPayload, {
          margin: 1,
          width: 200,
        });

        const qrCid = "enxremqr";
        const m = /^data:image\/png;base64,([\s\S]+)$/i.exec(qrDataUrl.trim());
        const qrContent = m
          ? Buffer.from(m[1].replace(/\s/g, ""), "base64")
          : Buffer.alloc(0);

        const pdfBytes = createBookingTicketsPdfBytes({
          userName: booking.user.name ?? "there",
          userEmail: booking.user.email,
          paymentIntentId: booking.paymentIntentId ?? "Unknown",
          events: [
            {
              eventTitle: event.title,
              eventDate: eventDateLong,
              eventTime,
              eventLocation: event.location,
              qrPayload,
              qrDataUrl,
              rows: [
                {
                  bookingId: booking.id,
                  ticketName: booking.ticketType.name,
                  quantity: booking.quantity,
                  totalAmount: booking.totalAmount,
                  status: booking.status,
                },
              ],
            },
          ],
        });

        const pdfAttachment = {
          filename: `eventnexus-reminder-${booking.id}.pdf`,
          content: Buffer.from(pdfBytes),
          contentType: "application/pdf",
        };

        const qrAttachment = {
          filename: `qr-${booking.id}.png`,
          content: qrContent,
          contentType: "image/png",
          contentId: qrCid,
        };

        const html = await render(
          EventReminderEmail({
            userName: booking.user.name ?? "there",
            eventTitle: event.title,
            eventWhen: formattedDate,
            eventStartsIso,
            eventLocation: event.location,
            ticketSummary: `${booking.quantity}× ${booking.ticketType.name}`,
            dashboardUrl: `${APP_URL}/dashboard`,
            bookingId: booking.id,
            qrCid,
            emailTheme: "auto",
            emailFallbackTheme: "light",
          })
        );

        const { error } = await resend.emails.send({
          from: FROM,
          to: [booking.user.email],
          subject: `Reminder: ${event.title} is tomorrow`,
          html,
          attachments: [qrAttachment, pdfAttachment],
        });
        if (!error) emailsDispatched++;
      }
    }

    return NextResponse.json({
      message: "Reminders successfully dispatched",
      processed: emailsDispatched,
    });
  } catch (error) {
    console.error("[CRON_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
