import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminLayout from "./layout";

type AuthResult = Awaited<ReturnType<typeof auth>>;

describe("admin layout redirect logic", () => {
  beforeEach(() => {
    vi.mocked(redirect).mockClear();
    vi.mocked(auth).mockReset();
  });

  it("redirects unauthenticated users to /unauthorized", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    await expect(
      AdminLayout({ children: React.createElement("div") })
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/unauthorized");
  });

  it("redirects non-admin roles to /forbidden", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", role: "USER" },
    } as unknown as AuthResult);
    await expect(
      AdminLayout({ children: React.createElement("div") })
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/forbidden");
  });
});

