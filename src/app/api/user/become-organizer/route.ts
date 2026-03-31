/**
 * POST /api/user/become-organizer
 *
 * Upgrades the current USER's role to ORGANIZER when the request body
 * `code` matches env `BECOME_ORGANIZER` (set by an admin).
 */
import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromRequest } from "@/lib/client-ip";

function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const ip = getClientIpFromRequest(req);
  const ipLimit = await rateLimit(`become-organizer:ip:${ip}`, 20, 3600);
  if (!ipLimit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const userLimit = await rateLimit(`become-organizer:user:${session.user.id}`, 8, 86400);
  if (!userLimit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  if (session.user.role === "ORGANIZER" || session.user.role === "ADMIN") {
    return NextResponse.json(
      { error: "Already an organiser", role: session.user.role },
      { status: 409 }
    );
  }

  const expectedCode = process.env.BECOME_ORGANIZER?.trim();
  if (!expectedCode) {
    return NextResponse.json(
      { error: "Organiser signup is not enabled. Contact the team for access." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const code =
    typeof body === "object" &&
    body !== null &&
    "code" in body &&
    typeof (body as { code: unknown }).code === "string"
      ? (body as { code: string }).code.trim()
      : "";

  if (!secretMatches(code, expectedCode)) {
    return NextResponse.json({ error: "Invalid organiser code." }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { role: "ORGANIZER" },
  });

  return NextResponse.json({ success: true, role: "ORGANIZER" });
}
