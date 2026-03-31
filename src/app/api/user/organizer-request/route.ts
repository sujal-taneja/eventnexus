import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromRequest } from "@/lib/client-ip";
import { redis } from "@/lib/redis";

function emailFromHeader(input: string | undefined): string {
  if (!input) return "";
  const m = /<([^>]+)>/.exec(input);
  return (m?.[1] ?? input).trim();
}

const REQUEST_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function requestKey(userId: string): string {
  return `organizer:request:${userId}`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const key = requestKey(session.user.id);
  const status = (await redis.get(key)) ?? null;
  return NextResponse.json({ status }); // "PENDING" | null
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  await redis.del(requestKey(session.user.id));
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  if (session.user.role === "ORGANIZER" || session.user.role === "ADMIN") {
    return NextResponse.json(
      { error: "You are already an organiser." },
      { status: 409 }
    );
  }

  // One active request per user.
  const pendingKey = requestKey(session.user.id);
  const already = await redis.get(pendingKey);
  if (already === "PENDING") {
    return NextResponse.json(
      { error: "Request already sent. Please wait for admin review." },
      { status: 409 }
    );
  }

  const ip = getClientIpFromRequest(req);
  const ipLimit = await rateLimit(`organizer-request:ip:${ip}`, 12, 3600);
  if (!ipLimit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const userLimit = await rateLimit(
    `organizer-request:user:${session.user.id}`,
    4,
    86400
  );
  if (!userLimit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "EventNexus <onboarding@resend.dev>";
  const adminTo =
    process.env.ADMIN_EMAIL?.trim() || emailFromHeader(process.env.EMAIL_FROM);

  if (!apiKey || !adminTo) {
    return NextResponse.json(
      { error: "Admin request email is not configured yet." },
      { status: 503 }
    );
  }

  const resend = new Resend(apiKey);
  const requestedAt = new Date().toISOString();
  const userEmail = session.user.email ?? "unknown";
  const userName = session.user.name ?? "Unknown user";

  const html = `
    <div style="font-family: Inter,Segoe UI,Arial,sans-serif; line-height:1.5; color:#111">
      <h2 style="margin:0 0 12px">Organizer access request</h2>
      <p style="margin:0 0 10px">A user requested organizer permission.</p>
      <ul style="padding-left:18px; margin:0 0 14px">
        <li><strong>User ID:</strong> ${session.user.id}</li>
        <li><strong>Name:</strong> ${userName}</li>
        <li><strong>Email:</strong> ${userEmail}</li>
        <li><strong>Requested at:</strong> ${requestedAt}</li>
      </ul>
      <p style="margin:0;color:#555">Review this user and upgrade role to ORGANIZER if approved.</p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from,
    to: [adminTo],
    subject: "EventNexus: Organizer access request",
    html,
    replyTo: userEmail !== "unknown" ? userEmail : undefined,
  });

  if (error) {
    console.error("[ORGANIZER_REQUEST_EMAIL]", error);
    return NextResponse.json({ error: "Could not send request." }, { status: 502 });
  }

  await redis.set(pendingKey, "PENDING", "EX", REQUEST_TTL_SECONDS);
  return NextResponse.json({ success: true });
}
