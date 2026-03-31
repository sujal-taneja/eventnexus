import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import UnauthorizedPage from "./page";

describe("unauthorized page", () => {
  it("renders auth required copy", () => {
    render(<UnauthorizedPage />);
    expect(screen.getByRole("heading", { name: /sign in required/i })).toBeInTheDocument();
    expect(screen.getByText(/you need to be signed in/i)).toBeInTheDocument();
    expect(screen.getByText(/go to login/i)).toBeInTheDocument();
  });
});

