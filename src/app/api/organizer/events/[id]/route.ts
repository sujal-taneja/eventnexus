import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromRequest } from "@/lib/client-ip";
import { invalidateSearchCaches } from "@/lib/invalidate-search-cache";

async function ensureOrganizerEvent(organizerId: string, eventId: string) {
  return prisma.event.findFirst({
    where: { id: eventId, organizerId },
  });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await context.params;
    const session = await auth();
    if (!session || (session.user.role !== "ORGANIZER" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIpFromRequest(req);
    const ipCap = await rateLimit(`organizer-event-patch:ip:${ip}`, 120, 3600);
    if (!ipCap.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const event = await ensureOrganizerEvent(session.user.id, eventId);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      title?: string;
      description?: string;
      date?: string;
      location?: string;
      imageUrl?: string;
      category?: string;
    };

    const title = body.title?.trim();
    const description = body.description?.trim();
    const dateStr = body.date;
    const location = body.location?.trim();
    const imageUrl = body.imageUrl?.trim();
    const category = body.category?.trim();

    if (!title || !description || !dateStr || !location || !imageUrl || !category) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: { title, description, date, location, imageUrl, category },
    });

    await invalidateSearchCaches();

    return NextResponse.json({ success: true, event: updated });
  } catch (e) {
    console.error("[ORGANIZER_EVENT_PATCH]", e);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}
