import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromRequest } from "@/lib/client-ip";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await context.params;
    const session = await auth();

    // Check if user is logged in
    if (!session || (session.user.role !== "ORGANIZER" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIpFromRequest(req);
    const ipCap = await rateLimit(`organizer-tickets:ip:${ip}`, 120, 3600);
    if (!ipCap.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const userCap = await rateLimit(`organizer-tickets:user:${session.user.id}`, 80, 3600);
    if (!userCap.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Verify event belongs to this organizer
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId: session.user.id },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found or unauthorized" }, { status: 404 });
    }

    const formData = await req.formData();
    
    const name = formData.get("name")?.toString().trim();
    const priceStr = formData.get("price")?.toString();
    const capacityStr = formData.get("capacity")?.toString();

    if (!name || !priceStr || !capacityStr) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const price = parseFloat(priceStr);
    const capacity = parseInt(capacityStr, 10);

    if (isNaN(price) || price < 0 || isNaN(capacity) || capacity < 1) {
      return NextResponse.json({ error: "Invalid price or capacity amounts" }, { status: 400 });
    }

    // Create the ticket type
    const ticketType = await prisma.ticketType.create({
      data: {
         name,
         price,
         capacity,
         eventId: event.id
      }
    });

    return NextResponse.json({ success: true, ticketType });
  } catch (error: unknown) {
    console.error("[ORGANIZER_TICKET_CREATE]", error);
    return NextResponse.json(
      { error: "An error occurred while creating the ticket tier" },
      { status: 500 }
    );
  }
}
