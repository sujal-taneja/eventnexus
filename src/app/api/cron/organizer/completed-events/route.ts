import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromRequest } from "@/lib/client-ip";
import { redis } from "@/lib/redis";

const FROM = process.env.EMAIL_FROM ?? "EventNexus <onboarding@resend.dev>";

async function claimEventDigestSend(eventId: string): Promise<boolean> {
  try {
    const ok = await redis.set(
      `organizer:event-digest:${eventId}`,
      "1",
      "EX",
      60 * 60 * 24 * 120,
      "NX"
    );
    return ok === "OK";
  } catch {
    return true;
  }
}

export async function GET(req: NextRequest) {
  const ip = getClientIpFromRequest(req);
  const burst = await rateLimit(`cron-organizer-completed:${ip}`, 20, 3600);
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

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Email not configured", sent: 0 },
      { status: 503 }
    );
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  const now = new Date();
  const completedBefore = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const events = await prisma.event.findMany({
    where: {
      isActive: true,
      date: { lte: completedBefore },
      organizer: { email: { not: null } },
    },
    select: {
      id: true,
      title: true,
      date: true,
      location: true,
      organizer: { select: { id: true, name: true, email: true } },
    },
    take: 200,
    orderBy: { date: "desc" },
  });

  let sent = 0;
  for (const ev of events) {
    const organizerEmail = ev.organizer.email;
    if (!organizerEmail) continue;

    const firstSend = await claimEventDigestSend(ev.id);
    if (!firstSend) continue;

    const aggregate = await prisma.booking.aggregate({
      where: { eventId: ev.id, status: "CONFIRMED" },
      _sum: { totalAmount: true, quantity: true },
      _count: true,
    });

    const grossRevenue = Math.round(aggregate._sum.totalAmount ?? 0);
    const ticketsSold = aggregate._sum.quantity ?? 0;
    const bookingRows = aggregate._count ?? 0;
    const heldOn = ev.date.toLocaleString("en-IN", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });

    const html = `
      <div style="font-family:Inter,Segoe UI,Arial,sans-serif;color:#111;line-height:1.5">
        <h2 style="margin:0 0 10px">Event performance summary</h2>
        <p style="margin:0 0 12px">Your event has been completed. Here is the revenue summary.</p>
        <div style="padding:12px;border:1px solid #ddd;border-radius:10px;margin-bottom:12px">
          <p style="margin:0 0 6px"><strong>Event:</strong> ${ev.title}</p>
          <p style="margin:0 0 6px"><strong>Held on:</strong> ${heldOn}</p>
          <p style="margin:0 0 6px"><strong>Location:</strong> ${ev.location}</p>
        </div>
        <ul style="margin:0 0 12px;padding-left:18px">
          <li><strong>Gross revenue:</strong> ₹${grossRevenue.toLocaleString("en-IN")}</li>
          <li><strong>Tickets sold:</strong> ${ticketsSold.toLocaleString("en-IN")}</li>
          <li><strong>Confirmed bookings:</strong> ${bookingRows.toLocaleString("en-IN")}</li>
        </ul>
        <p style="margin:0;color:#555">Open your organizer dashboard for detailed charts and attendee breakdown.</p>
      </div>
    `;

    const { error } = await resend.emails.send({
      from: FROM,
      to: [organizerEmail],
      subject: `Event summary: ${ev.title}`,
      html,
    });

    if (error) {
      console.error("[CRON_ORG_COMPLETED]", error);
      continue;
    }
    sent++;
  }

  return NextResponse.json({ message: "Completed-event summaries sent", sent });
}
