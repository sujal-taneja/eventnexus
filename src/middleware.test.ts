import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock NextAuth so middleware exports the inner callback directly.
vi.mock("next-auth", () => ({
  default: () => ({
    auth: (cb: (req: unknown) => unknown) => cb,
  }),
}));

vi.mock("@/lib/auth.config", () => ({
  default: {},
}));

import proxy, { config } from "./proxy";

describe("proxy auth redirects", () => {
  it("redirects unauthenticated users from protected routes to login", async () => {
    const req = new NextRequest("http://localhost/dashboard", {
      method: "GET",
    }) as NextRequest & {
      auth: unknown;
    };
    req.auth = null;

    const res = await proxy(
      req as unknown as Parameters<typeof proxy>[0],
    );
    expect(res).toBeInstanceOf(Response);
    expect([302, 307]).toContain(res.status);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/login");
    expect(location).toContain("callbackUrl=");
  });

  it("redirects unauthenticated users from organiser dashboard to login", async () => {
    const req = new NextRequest("http://localhost/organizer", {
      method: "GET",
    }) as NextRequest & { auth: unknown };
    req.auth = null;

    const res = await proxy(
      req as unknown as Parameters<typeof proxy>[0],
    );
    expect(res).toBeInstanceOf(Response);
    expect([302, 307]).toContain(res.status);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/login");
    expect(location).toContain("callbackUrl=");
  });

  it("allows logged-in non-organiser roles through proxy on organiser routes", async () => {
    const req = new NextRequest("http://localhost/organizer", {
      method: "GET",
    }) as NextRequest & { auth: unknown };
    req.auth = { user: { id: "u1", role: "USER" } };

    const res = await proxy(
      req as unknown as Parameters<typeof proxy>[0],
    );
    expect(res).toBeUndefined();
  });

  it("redirects signed-in users away from auth pages to /events", async () => {
    const req = new NextRequest("http://localhost/login", {
      method: "GET",
    }) as NextRequest & {
      auth: unknown;
    };
    req.auth = { user: { id: "u1" } };

    const res = await proxy(
      req as unknown as Parameters<typeof proxy>[0],
    );
    expect([302, 307]).toContain(res.status);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/events");
  });

  it("exports a matcher config", () => {
    expect(Array.isArray(config.matcher)).toBe(true);
  });
});
