import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/client-ip", () => ({
  getClientIpFromRequest: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: { findFirst: vi.fn() },
    booking: { findMany: vi.fn() },
  },
}));

import { GET } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

type Role = "USER" | "ORGANIZER" | "ADMIN";
type TestSession = { user: { id: string; role: Role } };

function makeReq() {
  return new NextRequest("http://localhost/api/organizer/events/evt1/export", {
    method: "GET",
    headers: { "x-forwarded-for": "127.0.0.1" },
  });
}

describe("GET /api/organizer/events/[id]/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for non-organizer roles", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", role: "USER" as Role },
    } as TestSession);

    const res = await GET(makeReq(), {
      params: Promise.resolve({ id: "evt1" }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limit fails", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", role: "ORGANIZER" as Role },
    } as TestSession);

    vi.mocked(rateLimit).mockResolvedValueOnce({
      success: false,
      remaining: 0,
      limit: 60,
      resetInSeconds: 42,
    });

    const res = await GET(makeReq(), {
      params: Promise.resolve({ id: "evt1" }),
    });

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/Too many requests/i);
  });

  it("returns CSV with bookings and check-in flags", async () => {
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

    vi.mocked(prisma.event.findFirst).mockResolvedValue({
      title: "Tech Summit",
    });

    vi.mocked(prisma.booking.findMany).mockResolvedValue([
      {
        id: "b1",
        quantity: 2,
        totalAmount: 500,
        checkedInAt: null,
        createdAt: new Date("2026-03-30T10:00:00.000Z"),
        user: { name: "Alice", email: "alice@example.com" },
        ticketType: { name: "VIP" },
      },
      {
        id: "b2",
        quantity: 1,
        totalAmount: 250,
        checkedInAt: new Date("2026-03-31T10:00:00.000Z"),
        createdAt: new Date("2026-03-30T11:00:00.000Z"),
        user: { name: null, email: "bob@example.com" },
        ticketType: { name: "GA" },
      },
    ]);

    const res = await GET(makeReq(), {
      params: Promise.resolve({ id: "evt1" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");

    const csv = await res.text();
    expect(csv).toContain("name,email,ticket_type,quantity,paid_inr,checked_in,booked_at");
    expect(csv).toContain("Alice");
    expect(csv).toContain("yes");
    expect(csv).toContain("no");
  });
});

