import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromRequest } from "@/lib/client-ip";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    // Check if user is logged in and is either ORGANIZER or ADMIN
    if (!session || (session.user.role !== "ORGANIZER" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIpFromRequest(req);
    const ipCap = await rateLimit(`organizer-events:ip:${ip}`, 60, 3600);
    if (!ipCap.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const userCap = await rateLimit(`organizer-events:user:${session.user.id}`, 40, 3600);
    if (!userCap.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const formData = await req.formData();
    
    const title = formData.get("title")?.toString().trim();
    const description = formData.get("description")?.toString().trim();
    const dateStr = formData.get("date")?.toString();
    const location = formData.get("location")?.toString().trim();
    const imageUrl = formData.get("imageUrl")?.toString().trim();
    const category = formData.get("category")?.toString().trim();
    const timeZone = formData.get("timeZone")?.toString().trim();

    // Basic Validation
    if (!title || !description || !dateStr || !location || !imageUrl || !category) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    // Create the event
    const event = await prisma.event.create({
      data: {
        title,
        description,
        date,
        timeZone: timeZone || "Asia/Kolkata",
        location,
        imageUrl,
        category,
        organizerId: session.user.id,
      },
    });

    return NextResponse.json({ success: true, event });
  } catch (error: unknown) {
    console.error("[ORGANIZER_EVENT_CREATE]", error);
    return NextResponse.json(
      { error: "An error occurred while creating the event" },
      { status: 500 }
    );
  }
}
