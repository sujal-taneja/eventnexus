import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromRequest } from "@/lib/client-ip";

const BATCH_RE = /^eventnexus:batch:([\w-]+(?:,[\w-]+)*)$/i;

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await context.params;
  const session = await auth();
  if (!session || (session.user.role !== "ORGANIZER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIpFromRequest(req);
  const cap = await rateLimit(`organizer-checkin:ip:${ip}`, 200, 3600);
  if (!cap.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizerId: session.user.id },
    select: { id: true, title: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  let raw: string;
  try {
    const body = await req.json();
    raw = typeof body?.raw === "string" ? body.raw.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const m = BATCH_RE.exec(raw);
  if (!m) {
    return NextResponse.json(
      { error: "Unrecognised QR. Expected an EventNexus batch ticket code." },
      { status: 400 }
    );
  }

  const ids = [...new Set(m[1].split(",").filter(Boolean))];
  if (ids.length === 0) {
    return NextResponse.json({ error: "No booking ids in code" }, { status: 400 });
  }

  const bookings = await prisma.booking.findMany({
    where: {
      id: { in: ids },
      eventId,
      status: "CONFIRMED",
    },
    select: { id: true },
  });

  if (bookings.length === 0) {
    return NextResponse.json(
      { error: "No matching confirmed bookings for this event" },
      { status: 404 }
    );
  }

  const now = new Date();
  await prisma.booking.updateMany({
    where: { id: { in: bookings.map((b) => b.id) } },
    data: { checkedInAt: now },
  });

  return NextResponse.json({
    success: true,
    checkedIn: bookings.length,
    eventTitle: event.title,
  });
}
