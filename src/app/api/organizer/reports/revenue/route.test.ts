import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/client-ip", () => ({
  getClientIpFromRequest: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: { findMany: vi.fn() },
  },
}));

import { GET } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

type Role = "USER" | "ORGANIZER" | "ADMIN";
type TestSession = { user: { id: string; role: Role } };

function makeReq() {
  return new NextRequest("http://localhost/api/organizer/reports/revenue", {
    method: "GET",
    headers: { "x-forwarded-for": "127.0.0.1" },
  });
}

describe("GET /api/organizer/reports/revenue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_URL = "http://localhost:3000";
  });

  it("returns 401 for non-organizer roles", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", role: "USER" as Role },
    } as TestSession);

    vi.mocked(rateLimit).mockResolvedValue({
      success: true,
      remaining: 0,
      limit: 0,
      resetInSeconds: 60,
    });

    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 429 when IP cap is exceeded", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", role: "ORGANIZER" as Role },
    } as TestSession);

    vi.mocked(rateLimit).mockResolvedValueOnce({
      success: false,
      remaining: 0,
      limit: 60,
      resetInSeconds: 42,
    });

    const res = await GET(makeReq());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/Too many requests/i);
  });

  it("returns CSV when authorized", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", role: "ADMIN" as Role },
    } as TestSession);

    vi.mocked(rateLimit).mockResolvedValueOnce({
      success: true,
      remaining: 59,
      limit: 60,
      resetInSeconds: 3600,
    });
    vi.mocked(rateLimit).mockResolvedValueOnce({
      success: true,
      remaining: 239,
      limit: 240,
      resetInSeconds: 3600,
    });

    vi.mocked(prisma.event.findMany).mockResolvedValue([
      {
        id: "evt1",
        title: "Concert",
        location: "Mumbai",
        date: new Date("2026-03-31T10:00:00.000Z"),
        bookings: [
          { quantity: 2, totalAmount: 500 },
          { quantity: 1, totalAmount: 250.5 },
        ],
      },
    ]);

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");

    const csv = await res.text();
    expect(csv).toContain("event_title,event_date_iso,location");
    expect(csv).toContain("Concert");
    // revenue_inr should be rounded to 2 decimals; 500 + 250.5 = 750.5
    expect(csv).toContain("750.5");
  });
});

