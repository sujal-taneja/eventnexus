import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromRequest } from "@/lib/client-ip";

function csvEscape(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await context.params;
  const session = await auth();
  if (!session || (session.user.role !== "ORGANIZER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIpFromRequest(req);
  const ipCap = await rateLimit(`organizer-export:ip:${ip}`, 60, 3600);
  if (!ipCap.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(ipCap.resetInSeconds) } }
    );
  }

  const userCap = await rateLimit(
    `organizer-export:user:${session.user.id}`,
    240,
    3600
  );
  if (!userCap.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(userCap.resetInSeconds) } }
    );
  }

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizerId: session.user.id },
    select: { title: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bookings = await prisma.booking.findMany({
    where: { eventId, status: "CONFIRMED" },
    include: {
      user: { select: { name: true, email: true } },
      ticketType: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const header = [
    "name",
    "email",
    "ticket_type",
    "quantity",
    "paid_inr",
    "checked_in",
    "booked_at",
  ];
  const lines = [header.join(",")];
  for (const b of bookings) {
    lines.push(
      [
        csvEscape(b.user.name ?? ""),
        csvEscape(b.user.email ?? ""),
        csvEscape(b.ticketType.name),
        String(b.quantity),
        String(b.totalAmount),
        b.checkedInAt ? "yes" : "no",
        b.createdAt.toISOString(),
      ].join(",")
    );
  }

  const csv = lines.join("\n");
  const safeName = event.title.replace(/[^\w\-]+/g, "_").slice(0, 60);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendees-${safeName}.csv"`,
    },
  });
}
