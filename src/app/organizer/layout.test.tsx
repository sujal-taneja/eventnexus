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
import OrganizerLayout from "./layout";

type AuthResult = Awaited<ReturnType<typeof auth>>;

describe("organizer layout redirect logic", () => {
  beforeEach(() => {
    vi.mocked(redirect).mockClear();
    vi.mocked(auth).mockReset();
  });

  it("redirects unauthenticated users to /unauthorized", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    await expect(
      OrganizerLayout({ children: React.createElement("div") })
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/unauthorized");
  });

  it("redirects non-organizer roles to /forbidden", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", role: "USER" },
    } as unknown as AuthResult);
    await expect(
      OrganizerLayout({ children: React.createElement("div") })
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/forbidden");
  });

  it("does not redirect when role is ORGANIZER", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", role: "ORGANIZER" },
    } as unknown as AuthResult);
    await expect(
      OrganizerLayout({ children: React.createElement("div") })
    ).resolves.toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });
});

