import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromRequest } from "@/lib/client-ip";

function csvEscape(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session || (session.user.role !== "ORGANIZER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIpFromRequest(req);
  const ipCap = await rateLimit(`organizer-revenue:ip:${ip}`, 60, 3600);
  if (!ipCap.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(ipCap.resetInSeconds) } }
    );
  }

  const userCap = await rateLimit(
    `organizer-revenue:user:${session.user.id}`,
    240,
    3600
  );
  if (!userCap.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(userCap.resetInSeconds) } }
    );
  }

  const events = await prisma.event.findMany({
    where: { organizerId: session.user.id },
    orderBy: { date: "desc" },
    include: {
      bookings: {
        where: { status: "CONFIRMED" },
        select: { quantity: true, totalAmount: true },
      },
    },
  });

  const header = [
    "event_title",
    "event_date_iso",
    "location",
    "confirmed_booking_lines",
    "tickets_sold",
    "revenue_inr",
  ];
  const lines = [header.join(",")];

  for (const e of events) {
    const linesCount = e.bookings.length;
    const ticketsSold = e.bookings.reduce((s, b) => s + b.quantity, 0);
    const revenue = e.bookings.reduce((s, b) => s + b.totalAmount, 0);
    lines.push(
      [
        csvEscape(e.title),
        e.date.toISOString(),
        csvEscape(e.location),
        String(linesCount),
        String(ticketsSold),
        String(Math.round(revenue * 100) / 100),
      ].join(",")
    );
  }

  const csv = lines.join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="eventnexus-revenue-report.csv"',
    },
  });
}
