import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromRequest } from "@/lib/client-ip";
import { redis } from "@/lib/redis";

const FROM = process.env.EMAIL_FROM ?? "EventNexus <onboarding@resend.dev>";

async function claimMonthlyDigestSend(
  organizerId: string,
  monthKey: string
): Promise<boolean> {
  try {
    const ok = await redis.set(
      `organizer:monthly-digest:${organizerId}:${monthKey}`,
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
  const burst = await rateLimit(`cron-organizer-monthly:${ip}`, 20, 3600);
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

  const configuredDay = Number(process.env.ORGANIZER_MONTHLY_REPORT_DAY ?? "1");
  const now = new Date();
  if (now.getUTCDate() !== configuredDay) {
    return NextResponse.json({
      message: "Skipped: not configured monthly report day.",
      reportDay: configuredDay,
      todayUtcDate: now.getUTCDate(),
    });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Email not configured", sent: 0 },
      { status: 503 }
    );
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}`;

  const organizers = await prisma.user.findMany({
    where: {
      role: { in: ["ORGANIZER", "ADMIN"] },
      email: { not: null },
    },
    select: { id: true, name: true, email: true },
  });

  let sent = 0;
  for (const organizer of organizers) {
    if (!organizer.email) continue;
    const firstSend = await claimMonthlyDigestSend(organizer.id, monthKey);
    if (!firstSend) continue;

    const totals = await prisma.booking.aggregate({
      where: {
        status: "CONFIRMED",
        createdAt: { gte: since, lte: now },
        event: { organizerId: organizer.id },
      },
      _sum: { totalAmount: true, quantity: true },
      _count: true,
    });

    const topByEvent = await prisma.booking.groupBy({
      by: ["eventId"],
      where: {
        status: "CONFIRMED",
        createdAt: { gte: since, lte: now },
        event: { organizerId: organizer.id },
      },
      _sum: { totalAmount: true, quantity: true },
      orderBy: { _sum: { totalAmount: "desc" } },
      take: 5,
    });

    const eventTitles = await prisma.event.findMany({
      where: { id: { in: topByEvent.map((x) => x.eventId) } },
      select: { id: true, title: true },
    });
    const titleMap = new Map(eventTitles.map((e) => [e.id, e.title]));

    const topRows = topByEvent
      .map((x) => {
        const title = titleMap.get(x.eventId) ?? "Untitled event";
        const rev = Math.round(x._sum.totalAmount ?? 0).toLocaleString("en-IN");
        const qty = (x._sum.quantity ?? 0).toLocaleString("en-IN");
        return `<li><strong>${title}</strong> — ₹${rev} (${qty} tickets)</li>`;
      })
      .join("");

    const grossRevenue = Math.round(totals._sum.totalAmount ?? 0);
    const ticketsSold = totals._sum.quantity ?? 0;
    const bookingsCount = totals._count ?? 0;

    const html = `
      <div style="font-family:Inter,Segoe UI,Arial,sans-serif;color:#111;line-height:1.5">
        <h2 style="margin:0 0 10px">Monthly organizer revenue report</h2>
        <p style="margin:0 0 12px">Hi ${organizer.name ?? "there"}, here is your last 30-day summary.</p>
        <ul style="margin:0 0 12px;padding-left:18px">
          <li><strong>Gross revenue (30 days):</strong> ₹${grossRevenue.toLocaleString("en-IN")}</li>
          <li><strong>Tickets sold:</strong> ${ticketsSold.toLocaleString("en-IN")}</li>
          <li><strong>Confirmed bookings:</strong> ${bookingsCount.toLocaleString("en-IN")}</li>
        </ul>
        <h3 style="margin:12px 0 8px;font-size:15px">Top events by revenue</h3>
        <ul style="margin:0;padding-left:18px">${topRows || "<li>No bookings in the last 30 days.</li>"}</ul>
      </div>
    `;

    const { error } = await resend.emails.send({
      from: FROM,
      to: [organizer.email],
      subject: "Your monthly EventNexus revenue report",
      html,
    });
    if (error) {
      console.error("[CRON_ORG_MONTHLY]", error);
      continue;
    }
    sent++;
  }

  return NextResponse.json({ message: "Monthly organizer reports sent", sent });
}
