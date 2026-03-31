import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/client-ip", () => ({
  getClientIpFromRequest: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/math-captcha-server", () => ({
  verifyMathCaptcha: vi.fn(),
}));

vi.mock("@/lib/turnstile-server", () => ({
  verifyTurnstileToken: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contactMessage: { create: vi.fn() },
  },
}));

import { POST } from "./route";
import { rateLimit } from "@/lib/rate-limit";
import { verifyMathCaptcha } from "@/lib/math-captcha-server";
import { verifyTurnstileToken } from "@/lib/turnstile-server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/contact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY = "turnstile_secret";

    vi.mocked(rateLimit).mockResolvedValue({
      success: true,
      resetInSeconds: 60,
    });
    vi.mocked(verifyMathCaptcha).mockReturnValue(true);
    vi.mocked(verifyTurnstileToken).mockResolvedValue(true);
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", role: "USER", email: "alice@example.com", name: "Alice" },
    });
    vi.mocked(prisma.contactMessage.create).mockResolvedValue({
      id: "m1",
    } as never);
  });

  it("429s when rate limiting fails", async () => {
    vi.mocked(rateLimit).mockResolvedValueOnce({
      success: false,
      resetInSeconds: 42,
    });

    const res = await POST(
      makeRequest({
        name: "Alice",
        email: "alice@example.com",
        subject: "Hello",
        message: "Test message",
        turnstileToken: "t",
      })
    );

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/Too many messages/);
  });

  it("400s when math captcha fails", async () => {
    vi.mocked(verifyMathCaptcha).mockReturnValueOnce(false);

    const res = await POST(
      makeRequest({
        name: "Alice",
        email: "alice@example.com",
        subject: "Hello",
        message: "Test message",
        turnstileToken: "t",
        captchaA: 2,
        captchaB: 3,
        captchaOp: "mul",
        captchaAnswer: 5,
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Security check failed/i);
  });

  it("400s when turnstile token is missing while configured", async () => {
    vi.mocked(verifyMathCaptcha).mockReturnValue(true);

    const res = await POST(
      makeRequest({
        name: "Alice",
        email: "alice@example.com",
        subject: "Hello",
        message: "Test message",
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Complete the security verification/i);
  });

  it("400s when turnstile verification returns false", async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValueOnce(false);

    const res = await POST(
      makeRequest({
        name: "Alice",
        email: "alice@example.com",
        subject: "Hello",
        message: "Test message",
        turnstileToken: "bad",
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Security verification failed/i);
    expect(prisma.contactMessage.create).not.toHaveBeenCalled();
  });

  it("stores contact message in database on success", async () => {
    const res = await POST(
      makeRequest({
        name: "Alice",
        email: "alice@example.com",
        subject: "Hello",
        message: "Test message",
        turnstileToken: "ok",
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(prisma.contactMessage.create).toHaveBeenCalledTimes(1);
  });
});

