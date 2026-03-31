import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import NotFound from "./not-found";

describe("not-found page", () => {
  it("renders not found copy and links", () => {
    render(<NotFound />);
    expect(
      screen.getByRole("heading", { name: /page not found/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/back to events/i)).toBeInTheDocument();
  });
});

