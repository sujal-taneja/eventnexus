import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import ForbiddenPage from "./page";

describe("forbidden page", () => {
  it("renders forbidden copy and actions", () => {
    render(<ForbiddenPage />);
    expect(
      screen.getByRole("heading", { name: /not allowed to access/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/contact support/i)).toBeInTheDocument();
  });
});

