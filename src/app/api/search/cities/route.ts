import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromRequest } from "@/lib/client-ip";

/**
 * Autocomplete cities / venue areas from distinct event locations (prefix match).
 */
export async function GET(req: NextRequest) {
  const ip = getClientIpFromRequest(req);
  const { success } = await rateLimit(`cities:${ip}`, 60, 60);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const events = await prisma.event.findMany({
    where: {
      isActive: true,
      location: { contains: q, mode: "insensitive" },
    },
    select: { location: true },
    take: 80,
  });

  const unique = [...new Set(events.map((e) => e.location.trim()))];
  const scored = unique
    .filter((loc) => loc.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      const ai = a.toLowerCase().indexOf(q.toLowerCase());
      const bi = b.toLowerCase().indexOf(q.toLowerCase());
      if (ai !== bi) return ai - bi;
      return a.length - b.length;
    })
    .slice(0, 8);

  return NextResponse.json({ suggestions: scored });
}
