import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromRequest } from "@/lib/client-ip";
import { verifyMathCaptcha } from "@/lib/math-captcha-server";
import { verifyTurnstileToken } from "@/lib/turnstile-server";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIpFromRequest(req);
    // Strict: contact form is abuse-prone (email cost + spam)
    const { success, resetInSeconds } = await rateLimit(`contact:${ip}`, 5, 3600);
    if (!success) {
      return NextResponse.json(
        { error: "Too many messages from this network. Please try again later." },
        { status: 429, headers: { "Retry-After": String(resetInSeconds) } }
      );
    }

    const body = await req.json();
    const { name, email, subject, message, turnstileToken } = body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof subject !== "string" ||
      typeof message !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !subject.trim() ||
      !message.trim()
    ) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    if (message.length > 8000 || subject.length > 200 || name.length > 200) {
      return NextResponse.json({ error: "Message too long." }, { status: 400 });
    }

    if (!verifyMathCaptcha(body)) {
      return NextResponse.json(
        { error: "Security check failed. Please solve the math question again." },
        { status: 400 }
      );
    }

    if (process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY) {
      if (!turnstileToken || typeof turnstileToken !== "string") {
        return NextResponse.json({ error: "Complete the security verification." }, { status: 400 });
      }
    }
    if (!(await verifyTurnstileToken(
      typeof turnstileToken === "string" ? turnstileToken : undefined
    ))) {
      return NextResponse.json({ error: "Security verification failed." }, { status: 400 });
    }

    const session = await auth();
    await prisma.contactMessage.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        userId: session?.user?.id ?? null,
        ip,
        userAgent: req.headers.get("user-agent") ?? null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CONTACT_API_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to submit message. Please try again later." },
      { status: 500 }
    );
  }
}
